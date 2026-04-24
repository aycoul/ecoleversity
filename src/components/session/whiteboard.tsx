"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type DataPublishOptions, type RemoteParticipant } from "livekit-client";
import { useTranslations } from "next-intl";
import {
  Pen,
  Highlighter,
  Eraser,
  Slash,
  Square,
  Circle,
  Type,
  MousePointer2,
  Undo2,
  Trash2,
  Download,
  X,
} from "lucide-react";

// ─── Item model ───────────────────────────────────────────────────────
// Every mark on the board is an "item" that lives in a flat, ordered
// list. Items are broadcast as whole objects over the LiveKit data
// channel; undo/clear are separate message types. Coordinates are
// normalized [0,1] so the board stays correct across window resizes
// and different client viewport sizes.

type Point = { x: number; y: number };
type ToolKind =
  | "pen"
  | "highlighter"
  | "eraser"
  | "line"
  | "rect"
  | "circle"
  | "text"
  | "laser";

type FreehandItem = {
  kind: "freehand";
  id: string;
  sender: string;
  tool: "pen" | "highlighter";
  color: string;
  width: number;
  points: Point[];
};
type ShapeItem = {
  kind: "shape";
  id: string;
  sender: string;
  shape: "line" | "rect" | "circle";
  color: string;
  width: number;
  start: Point;
  end: Point;
};
type TextItem = {
  kind: "text";
  id: string;
  sender: string;
  pos: Point;
  text: string;
  color: string;
  fontSize: number;
};
type Item = FreehandItem | ShapeItem | TextItem;

type WBMsgAdd = { type: "wb_add"; item: Item };
type WBMsgUndo = { type: "wb_undo"; ids: string[] };
type WBMsgClear = { type: "wb_clear" };
type WBMsgLaser = { type: "wb_laser"; sender: string; x: number; y: number };
type WBMsgRequest = { type: "wb_request" };
type WBMsgSnapshot = { type: "wb_snapshot"; items: Item[] };

const COLORS = [
  "#111827", // near-black
  "#EF4444", // red
  "#F59E0B", // amber
  "#10B981", // green
  "#3B82F6", // blue
  "#8B5CF6", // violet
];

const encode = (m: unknown) => new TextEncoder().encode(JSON.stringify(m));

// Rough "does this stroke cross point p" check for the eraser tool.
// Uses bounding box + point-to-segment distance. Threshold is generous
// since users don't click pixel-perfectly.
function itemHits(item: Item, p: Point, threshold = 0.02): boolean {
  if (item.kind === "freehand") {
    for (let i = 1; i < item.points.length; i++) {
      if (pointToSegment(p, item.points[i - 1], item.points[i]) < threshold) {
        return true;
      }
    }
    return false;
  }
  if (item.kind === "shape") {
    if (item.shape === "line") {
      return pointToSegment(p, item.start, item.end) < threshold;
    }
    if (item.shape === "rect") {
      // Edge hit: near any of the four sides
      const { start: a, end: b } = item;
      const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
      const y1 = Math.min(a.y, b.y), y2 = Math.max(a.y, b.y);
      const onTop = pointToSegment(p, { x: x1, y: y1 }, { x: x2, y: y1 }) < threshold;
      const onBottom = pointToSegment(p, { x: x1, y: y2 }, { x: x2, y: y2 }) < threshold;
      const onLeft = pointToSegment(p, { x: x1, y: y1 }, { x: x1, y: y2 }) < threshold;
      const onRight = pointToSegment(p, { x: x2, y: y1 }, { x: x2, y: y2 }) < threshold;
      return onTop || onBottom || onLeft || onRight;
    }
    if (item.shape === "circle") {
      const cx = (item.start.x + item.end.x) / 2;
      const cy = (item.start.y + item.end.y) / 2;
      const r = Math.hypot(item.end.x - item.start.x, item.end.y - item.start.y) / 2;
      const d = Math.hypot(p.x - cx, p.y - cy);
      return Math.abs(d - r) < threshold;
    }
  }
  if (item.kind === "text") {
    // Approximate: text bbox is small, fontSize is pixel-ish — treat as a dot
    return Math.hypot(p.x - item.pos.x, p.y - item.pos.y) < threshold * 2;
  }
  return false;
}

function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// ─── Component ────────────────────────────────────────────────────────

interface WhiteboardProps {
  onClose: () => void;
}

export function Whiteboard({ onClose }: WhiteboardProps) {
  const t = useTranslations("session");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const room = useRoomContext();

  const [tool, setTool] = useState<ToolKind>("pen");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [width, setWidth] = useState<number>(3);
  const [showColorPalette, setShowColorPalette] = useState(false);

  // Shared state: all finalized items across the room.
  const itemsRef = useRef<Item[]>([]);
  // Local ephemeral state for the current in-progress draw.
  const inFlightRef = useRef<Item | null>(null);
  // Remote laser-pointer positions (per sender, fades after 1.5s).
  const lasersRef = useRef<Map<string, { x: number; y: number; at: number }>>(new Map());
  const localIdRef = useRef<string>("");

  // Establish a local sender id once.
  useEffect(() => {
    localIdRef.current = room.localParticipant.identity;
  }, [room]);

  // ── Render loop ──────────────────────────────────────────────────
  // Redraws the entire board from items + in-flight + lasers. Called
  // imperatively whenever state changes so we don't blow up React.
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = container.getBoundingClientRect();
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // We set scale once on resize; here use CSS pixels
    ctx.restore();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Finalized items
    for (const item of itemsRef.current) {
      drawItem(ctx, item, rect.width, rect.height);
    }
    // In-flight
    if (inFlightRef.current) {
      drawItem(ctx, inFlightRef.current, rect.width, rect.height);
    }
    // Lasers (ephemeral overlays)
    const now = Date.now();
    for (const [, l] of lasersRef.current) {
      const age = now - l.at;
      if (age > 1500) continue;
      const alpha = Math.max(0, 1 - age / 1500);
      ctx.beginPath();
      ctx.arc(l.x * rect.width, l.y * rect.height, 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.35})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(l.x * rect.width, l.y * rect.height, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.fill();
    }
  }, []);

  // Animation loop just for laser fade
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (lasersRef.current.size > 0) redraw();
      // Purge old lasers
      const now = Date.now();
      for (const [id, l] of lasersRef.current) {
        if (now - l.at > 1500) lasersRef.current.delete(id);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [redraw]);

  // Resize handling + DPR-correct canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw]);

  // ── Data channel listener ───────────────────────────────────────
  useEffect(() => {
    const handler = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as
          | WBMsgAdd
          | WBMsgUndo
          | WBMsgClear
          | WBMsgLaser
          | WBMsgRequest
          | WBMsgSnapshot;

        if (msg.type === "wb_add") {
          itemsRef.current.push(msg.item);
          redraw();
        } else if (msg.type === "wb_undo") {
          const ids = new Set(msg.ids);
          itemsRef.current = itemsRef.current.filter((i) => !ids.has(i.id));
          redraw();
        } else if (msg.type === "wb_clear") {
          itemsRef.current = [];
          redraw();
        } else if (msg.type === "wb_laser") {
          lasersRef.current.set(msg.sender, { x: msg.x, y: msg.y, at: Date.now() });
          redraw();
        } else if (msg.type === "wb_request" && participant) {
          // Late joiner — snapshot the current state to them only if we
          // happen to have any items (helps new students catch up).
          if (itemsRef.current.length > 0) {
            publish({ type: "wb_snapshot", items: itemsRef.current });
          }
        } else if (msg.type === "wb_snapshot") {
          // Only merge in items we don't already have (dedupe by id).
          const seen = new Set(itemsRef.current.map((i) => i.id));
          for (const it of msg.items) if (!seen.has(it.id)) itemsRef.current.push(it);
          redraw();
        }
      } catch {
        // ignore non-whiteboard packets
      }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // On mount, request a snapshot from any already-open peer so late
  // joiners catch up to the current board state.
  useEffect(() => {
    const t = setTimeout(() => {
      publish({ type: "wb_request" });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function publish(msg: WBMsgAdd | WBMsgUndo | WBMsgClear | WBMsgLaser | WBMsgRequest | WBMsgSnapshot) {
    room.localParticipant.publishData(encode(msg), {
      reliable: msg.type !== "wb_laser", // laser is lossy — always current-state
    } as DataPublishOptions);
  }

  // ── Pointer handling ───────────────────────────────────────────
  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX =
      "touches" in e && e.touches.length > 0
        ? e.touches[0].clientX
        : "changedTouches" in e && e.changedTouches.length > 0
        ? e.changedTouches[0].clientX
        : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e && e.touches.length > 0
        ? e.touches[0].clientY
        : "changedTouches" in e && e.changedTouches.length > 0
        ? e.changedTouches[0].clientY
        : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const newId = () => `${localIdRef.current}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const p = getPoint(e);

    if (tool === "laser") {
      publish({ type: "wb_laser", sender: localIdRef.current, x: p.x, y: p.y });
      return;
    }

    if (tool === "eraser") {
      // Collect items we pass through, batch-undo on release.
      inFlightRef.current = {
        kind: "freehand",
        id: newId(),
        sender: localIdRef.current,
        tool: "pen", // doesn't matter — we don't persist this
        color: "rgba(0,0,0,0)",
        width: 0,
        points: [p],
      };
      // Immediately delete any item under cursor
      eraseAt(p);
      return;
    }

    if (tool === "text") {
      const text = window.prompt(t("whiteboardTextPrompt")) ?? "";
      if (!text.trim()) return;
      const item: TextItem = {
        kind: "text",
        id: newId(),
        sender: localIdRef.current,
        pos: p,
        text: text.trim(),
        color,
        fontSize: Math.max(16, width * 6),
      };
      itemsRef.current.push(item);
      publish({ type: "wb_add", item });
      redraw();
      return;
    }

    if (tool === "pen" || tool === "highlighter") {
      inFlightRef.current = {
        kind: "freehand",
        id: newId(),
        sender: localIdRef.current,
        tool,
        color,
        width,
        points: [p],
      };
      return;
    }

    if (tool === "line" || tool === "rect" || tool === "circle") {
      inFlightRef.current = {
        kind: "shape",
        id: newId(),
        sender: localIdRef.current,
        shape: tool,
        color,
        width,
        start: p,
        end: p,
      };
      return;
    }
  };

  const eraseAt = (p: Point) => {
    const toRemove = itemsRef.current.filter((i) => itemHits(i, p));
    if (toRemove.length === 0) return;
    const ids = toRemove.map((i) => i.id);
    itemsRef.current = itemsRef.current.filter((i) => !ids.includes(i.id));
    publish({ type: "wb_undo", ids });
    redraw();
  };

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const p = getPoint(e);

    if (tool === "laser") {
      // Only while a button is held (mouse) or finger down (touch).
      const isDragging =
        ("buttons" in e && (e as React.MouseEvent).buttons > 0) ||
        "touches" in e;
      if (isDragging) {
        publish({ type: "wb_laser", sender: localIdRef.current, x: p.x, y: p.y });
      }
      return;
    }

    if (!inFlightRef.current) return;

    if (tool === "eraser") {
      eraseAt(p);
      return;
    }
    if (inFlightRef.current.kind === "freehand") {
      inFlightRef.current.points.push(p);
    } else if (inFlightRef.current.kind === "shape") {
      inFlightRef.current.end = p;
    }
    redraw();
  };

  const onPointerUp = () => {
    const item = inFlightRef.current;
    inFlightRef.current = null;
    if (!item) return;

    // Eraser's in-flight was just a sentinel; actual work happened per-move.
    if (tool === "eraser") {
      redraw();
      return;
    }

    // Only persist if non-trivial
    if (item.kind === "freehand" && item.points.length < 2) {
      redraw();
      return;
    }
    if (
      item.kind === "shape" &&
      item.start.x === item.end.x &&
      item.start.y === item.end.y
    ) {
      redraw();
      return;
    }

    itemsRef.current.push(item);
    publish({ type: "wb_add", item });
    redraw();
  };

  // ── Toolbar actions ─────────────────────────────────────────────
  const undo = useCallback(() => {
    // Undo *own* items — preserves collaborative sanity (you can't erase
    // the teacher's notes by spamming undo).
    const mine = itemsRef.current.filter((i) => i.sender === localIdRef.current);
    if (mine.length === 0) return;
    const last = mine[mine.length - 1];
    itemsRef.current = itemsRef.current.filter((i) => i.id !== last.id);
    publish({ type: "wb_undo", ids: [last.id] });
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redraw]);

  const clearBoard = () => {
    itemsRef.current = [];
    publish({ type: "wb_clear" });
    redraw();
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Draw a white background first so the PNG isn't transparent
    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const offCtx = off.getContext("2d");
    if (!offCtx) return;
    offCtx.fillStyle = "#ffffff";
    offCtx.fillRect(0, 0, off.width, off.height);
    offCtx.drawImage(canvas, 0, 0);
    const url = off.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecoleversity-whiteboard-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Keyboard shortcut: Ctrl/Cmd+Z for undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  const ToolBtn = ({
    id,
    Icon,
    label,
  }: {
    id: ToolKind;
    Icon: React.ElementType;
    label: string;
  }) => (
    <button
      onClick={() => setTool(id)}
      className={`flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
        tool === id
          ? "border-[var(--ev-blue)] bg-[var(--ev-blue)] text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
      title={label}
      aria-label={label}
      aria-pressed={tool === id}
    >
      <Icon className="size-4" />
    </button>
  );

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Toolbar — horizontal scroll on narrow viewports */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-2 text-slate-700">
        {/* Drawing tools */}
        <div className="flex shrink-0 items-center gap-1">
          <ToolBtn id="pen" Icon={Pen} label={t("whiteboardPen")} />
          <ToolBtn id="highlighter" Icon={Highlighter} label={t("whiteboardHighlighter")} />
          <ToolBtn id="eraser" Icon={Eraser} label={t("whiteboardEraser")} />
        </div>

        <div className="h-6 w-px shrink-0 bg-slate-300" />

        {/* Shape tools */}
        <div className="flex shrink-0 items-center gap-1">
          <ToolBtn id="line" Icon={Slash} label={t("whiteboardLine")} />
          <ToolBtn id="rect" Icon={Square} label={t("whiteboardRect")} />
          <ToolBtn id="circle" Icon={Circle} label={t("whiteboardCircle")} />
          <ToolBtn id="text" Icon={Type} label={t("whiteboardText")} />
        </div>

        <div className="h-6 w-px shrink-0 bg-slate-300" />

        {/* Laser */}
        <ToolBtn id="laser" Icon={MousePointer2} label={t("whiteboardLaser")} />

        <div className="h-6 w-px shrink-0 bg-slate-300" />

        {/* Colors */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowColorPalette((v) => !v)}
            className="flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-50"
            title={t("whiteboardColor")}
            aria-label={t("whiteboardColor")}
          >
            <span
              className="size-5 rounded-full border border-slate-300"
              style={{ backgroundColor: color }}
            />
          </button>
          {showColorPalette && (
            <div className="absolute top-full left-0 z-30 mt-1 flex gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setShowColorPalette(false);
                  }}
                  className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c ? "border-slate-800" : "border-white"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>

        {/* Width */}
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="range"
            min={1}
            max={12}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-16 accent-[var(--ev-blue)]"
            aria-label={t("whiteboardWidth")}
            title={t("whiteboardWidth")}
          />
          <span className="w-5 text-center text-xs tabular-nums text-slate-500">
            {width}
          </span>
        </div>

        <div className="h-6 w-px shrink-0 bg-slate-300" />

        {/* Actions */}
        <button
          onClick={undo}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50"
          title={t("whiteboardUndo")}
          aria-label={t("whiteboardUndo")}
        >
          <Undo2 className="size-4" />
        </button>
        <button
          onClick={exportPng}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50"
          title={t("whiteboardExport")}
          aria-label={t("whiteboardExport")}
        >
          <Download className="size-4" />
        </button>
        <button
          onClick={clearBoard}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-red-300 bg-white text-red-600 transition-colors hover:bg-red-50"
          title={t("whiteboardClearAll")}
          aria-label={t("whiteboardClearAll")}
        >
          <Trash2 className="size-4" />
        </button>

        <div className="flex-1" />

        <button
          onClick={onClose}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100"
          title={t("whiteboardClose")}
          aria-label={t("whiteboardClose")}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1">
        <canvas
          ref={canvasRef}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
          className="absolute inset-0 cursor-crosshair touch-none"
          style={{ touchAction: "none" }}
        />
      </div>
    </div>
  );
}

// ─── Drawing ──────────────────────────────────────────────────────────

function drawItem(ctx: CanvasRenderingContext2D, item: Item, w: number, h: number) {
  if (item.kind === "freehand") {
    if (item.points.length < 1) return;
    ctx.save();
    if (item.tool === "highlighter") {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(item.width * 3, 8);
    } else {
      ctx.lineWidth = item.width;
    }
    ctx.strokeStyle = item.color;
    ctx.beginPath();
    ctx.moveTo(item.points[0].x * w, item.points[0].y * h);
    for (let i = 1; i < item.points.length; i++) {
      ctx.lineTo(item.points[i].x * w, item.points[i].y * h);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (item.kind === "shape") {
    ctx.save();
    ctx.lineWidth = item.width;
    ctx.strokeStyle = item.color;
    ctx.beginPath();
    if (item.shape === "line") {
      ctx.moveTo(item.start.x * w, item.start.y * h);
      ctx.lineTo(item.end.x * w, item.end.y * h);
    } else if (item.shape === "rect") {
      const x = Math.min(item.start.x, item.end.x) * w;
      const y = Math.min(item.start.y, item.end.y) * h;
      const rw = Math.abs(item.end.x - item.start.x) * w;
      const rh = Math.abs(item.end.y - item.start.y) * h;
      ctx.rect(x, y, rw, rh);
    } else if (item.shape === "circle") {
      const cx = ((item.start.x + item.end.x) / 2) * w;
      const cy = ((item.start.y + item.end.y) / 2) * h;
      const rx = (Math.abs(item.end.x - item.start.x) / 2) * w;
      const ry = (Math.abs(item.end.y - item.start.y) / 2) * h;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (item.kind === "text") {
    ctx.save();
    ctx.fillStyle = item.color;
    ctx.font = `${item.fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(item.text, item.pos.x * w, item.pos.y * h);
    ctx.restore();
    return;
  }
}
