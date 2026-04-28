"use client";

/**
 * Whiteboard v2 — designed for stylus + writing pad input.
 *
 * Architecture
 * ─────────────
 * - World coordinates (absolute floats), not normalised 0..1. Viewport
 *   transform (translate + scale) maps world → screen so pan/zoom is a
 *   pure CSS-free, ctx.setTransform call.
 * - Two canvases stacked:
 *     bgCanvas   — persistent items, redraw only when items change OR
 *                  viewport changes. Heavy.
 *     liveCanvas — the stroke currently being drawn. Redrawn per-frame
 *                  with rAF. Cheap.
 *   This separation is what lets writing feel smooth on a tablet — we
 *   never touch the heavy bg canvas during a stroke.
 * - Pointer Events (not mouse/touch). pointerEvent.getCoalescedEvents()
 *   feeds us 240Hz+ samples on stylus on Android Chrome. We push every
 *   sample, so the rendered stroke matches the pen's actual path even
 *   between rAF frames.
 * - Catmull-Rom smoothing applied on stroke commit (not during) to
 *   make strokes look like ink instead of polylines, without paying
 *   smoothing cost during dragging.
 * - Pressure (event.pressure ∈ [0,1]) modulates per-segment thickness.
 *
 * Sync over LiveKit data channels (versioned wb2_*):
 *   wb2_add      { item }                broadcast on commit
 *   wb2_update   { id, changes }         broadcast on move
 *   wb2_delete   { id }                  broadcast on erase
 *   wb2_clear    { }                     broadcast on Clear All
 *   wb2_request  { }                     late joiner asks for state
 *   wb2_snapshot { items[] }             any peer answers (jittered)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRoomContext } from "@livekit/components-react";
import {
  RoomEvent,
  type DataPublishOptions,
  type RemoteParticipant,
} from "livekit-client";
import { getStroke } from "perfect-freehand";
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Slash,
  ArrowUpRight,
  Type,
  StickyNote,
  MousePointer2,
  Hand,
  Undo2,
  Redo2,
  Trash2,
  Plus,
  Minus,
  Maximize,
  Download,
  X,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────

type Point = { x: number; y: number; p?: number };

type StrokeItem = {
  id: string;
  type: "stroke";
  tool: "pen" | "highlighter";
  color: string;
  thickness: number;
  points: Point[];
};

type ShapeItem = {
  id: string;
  type: "shape";
  shape: "rect" | "ellipse" | "line" | "arrow";
  color: string;
  thickness: number;
  from: Point;
  to: Point;
};

type TextItem = {
  id: string;
  type: "text";
  color: string;
  size: number;
  text: string;
  pos: Point;
};

type StickyItem = {
  id: string;
  type: "sticky";
  color: string;
  text: string;
  pos: Point;
  width: number;
  height: number;
};

type Item = StrokeItem | ShapeItem | TextItem | StickyItem;

type Tool =
  | "select"
  | "pan"
  | "pen"
  | "highlighter"
  | "eraser"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "sticky";

type Viewport = { x: number; y: number; scale: number };

type HistoryAction =
  | { kind: "add"; item: Item }
  | { kind: "delete"; item: Item }
  | { kind: "update"; before: Item; after: Item }
  | { kind: "clear"; items: Item[] };

const COLORS = [
  "#0f172a", // slate-900
  "#dc2626", // red-600
  "#ea580c", // orange-600
  "#ca8a04", // yellow-600
  "#16a34a", // green-600
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
  "#be185d", // pink-700
];

const STICKY_COLORS = [
  "#fef9c3", // yellow
  "#fce7f3", // pink
  "#dbeafe", // blue
  "#dcfce7", // green
];

const THICKNESS_OPTIONS = [2, 4, 8, 16];

// ─── Helpers ───────────────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();
const broadcast = (
  publish: (data: Uint8Array, opts: DataPublishOptions) => Promise<void>,
  msg: object
) => {
  try {
    void publish(enc.encode(JSON.stringify(msg)), { reliable: true } as DataPublishOptions);
  } catch (err) {
    console.warn("[wb2] publish failed:", err);
  }
};

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Render a stroke using perfect-freehand — same library tldraw and
 * Excalidraw use. Generates a tapered polygon outline with pressure-
 * varying thickness, then we fill it as a single path. This is what
 * gives writing the "ink on paper" feel rather than the chunky
 * polyline a naive stroke() produces.
 *
 * Tuning notes:
 *   - thinning: 0.6 → strong pressure → thickness mapping
 *   - smoothing: 0.5 → Bezier-grade curve smoothing on the input
 *   - streamline: 0.45 → low-pass filter on jittery samples
 *   - simulatePressure: false because we receive real pressure from
 *     the stylus; falling back to a velocity-based model only when
 *     pressure is the default 0.5 (which is the spec default for mouse
 *     and unsupported pens).
 */
function strokePath(ctx: CanvasRenderingContext2D, pts: Point[], size: number) {
  if (pts.length === 0) return;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Treat pressure 0.5 as "no real pressure" → simulate via velocity.
  const hasRealPressure = pts.some((p) => p.p !== undefined && p.p !== 0.5);
  const outline = getStroke(
    pts.map((p) => [p.x, p.y, p.p ?? 0.5]),
    {
      size,
      thinning: 0.6,
      smoothing: 0.5,
      streamline: 0.45,
      simulatePressure: !hasRealPressure,
      last: true,
      easing: (t: number) => t,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    }
  );
  if (outline.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i][0], outline[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

function drawItem(ctx: CanvasRenderingContext2D, it: Item) {
  if (it.type === "stroke") {
    ctx.fillStyle = it.color;
    ctx.globalAlpha = it.tool === "highlighter" ? 0.32 : 1;
    strokePath(ctx, it.points, it.thickness);
    ctx.globalAlpha = 1;
    return;
  }
  if (it.type === "shape") {
    ctx.strokeStyle = it.color;
    ctx.lineWidth = it.thickness;
    if (it.shape === "rect") {
      const x = Math.min(it.from.x, it.to.x);
      const y = Math.min(it.from.y, it.to.y);
      const w = Math.abs(it.to.x - it.from.x);
      const h = Math.abs(it.to.y - it.from.y);
      ctx.strokeRect(x, y, w, h);
    } else if (it.shape === "ellipse") {
      const cx = (it.from.x + it.to.x) / 2;
      const cy = (it.from.y + it.to.y) / 2;
      const rx = Math.abs(it.to.x - it.from.x) / 2;
      const ry = Math.abs(it.to.y - it.from.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (it.shape === "line") {
      ctx.beginPath();
      ctx.moveTo(it.from.x, it.from.y);
      ctx.lineTo(it.to.x, it.to.y);
      ctx.stroke();
    } else if (it.shape === "arrow") {
      const dx = it.to.x - it.from.x;
      const dy = it.to.y - it.from.y;
      const len = Math.hypot(dx, dy);
      const head = Math.min(20, len * 0.3);
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(it.from.x, it.from.y);
      ctx.lineTo(it.to.x, it.to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(it.to.x, it.to.y);
      ctx.lineTo(
        it.to.x - head * Math.cos(angle - Math.PI / 6),
        it.to.y - head * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        it.to.x - head * Math.cos(angle + Math.PI / 6),
        it.to.y - head * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = it.color;
      ctx.fill();
    }
    return;
  }
  if (it.type === "text") {
    ctx.fillStyle = it.color;
    ctx.font = `${it.size}px sans-serif`;
    ctx.textBaseline = "top";
    for (const [i, line] of it.text.split("\n").entries()) {
      ctx.fillText(line, it.pos.x, it.pos.y + i * it.size * 1.25);
    }
    return;
  }
  if (it.type === "sticky") {
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(it.pos.x + 4, it.pos.y + 4, it.width, it.height);
    // body
    ctx.fillStyle = it.color;
    ctx.fillRect(it.pos.x, it.pos.y, it.width, it.height);
    // text
    ctx.fillStyle = "#0f172a";
    ctx.font = "16px sans-serif";
    ctx.textBaseline = "top";
    const lineHeight = 20;
    const padding = 12;
    const maxWidth = it.width - padding * 2;
    let y = it.pos.y + padding;
    for (const para of it.text.split("\n")) {
      const words = para.split(" ");
      let line = "";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, it.pos.x + padding, y);
          y += lineHeight;
          line = w;
        } else {
          line = test;
        }
      }
      if (line) {
        ctx.fillText(line, it.pos.x + padding, y);
        y += lineHeight;
      }
    }
  }
}

/** Compute the axis-aligned bounding box of any item in world coords. */
function itemBounds(it: Item): { x: number; y: number; w: number; h: number } {
  if (it.type === "stroke") {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of it.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = it.thickness;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }
  if (it.type === "shape") {
    const x = Math.min(it.from.x, it.to.x);
    const y = Math.min(it.from.y, it.to.y);
    const w = Math.abs(it.to.x - it.from.x);
    const h = Math.abs(it.to.y - it.from.y);
    return { x, y, w, h };
  }
  if (it.type === "text") {
    const lines = it.text.split("\n");
    return {
      x: it.pos.x,
      y: it.pos.y,
      w: Math.max(20, ...lines.map((l) => l.length * it.size * 0.55)),
      h: lines.length * it.size * 1.25,
    };
  }
  return { x: it.pos.x, y: it.pos.y, w: it.width, h: it.height };
}

function pointInBounds(p: Point, b: { x: number; y: number; w: number; h: number }): boolean {
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}

function strokeHit(item: StrokeItem, p: Point, threshold: number): boolean {
  for (const sp of item.points) {
    const dx = sp.x - p.x;
    const dy = sp.y - p.y;
    if (dx * dx + dy * dy <= (threshold + item.thickness) ** 2) return true;
  }
  return false;
}

// ─── Component ─────────────────────────────────────────────────────────

export function Whiteboard({ onClose }: { onClose: () => void }) {
  const room = useRoomContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [thickness, setThickness] = useState<number>(THICKNESS_OPTIONS[1]);

  // Items + selection live in refs so pointer handlers don't re-create
  // on each render. React state mirrors the bits the UI cares about.
  const itemsRef = useRef<Map<string, Item>>(new Map());
  const itemOrderRef = useRef<string[]>([]); // z-order
  const selectedRef = useRef<Set<string>>(new Set());
  const [selectedCount, setSelectedCount] = useState(0);
  const [editing, setEditing] = useState<{ id: string; kind: "text" | "sticky" } | null>(null);

  const historyRef = useRef<HistoryAction[]>([]);
  const futureRef = useRef<HistoryAction[]>([]);

  const viewportRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 });
  const [, forceRender] = useState(0);
  const tick = useCallback(() => forceRender((v) => v + 1), []);

  // ── Coordinate transforms ────────────────────────────────────────────
  const screenToWorld = useCallback((sx: number, sy: number): Point => {
    const v = viewportRef.current;
    return { x: (sx - v.x) / v.scale, y: (sy - v.y) / v.scale };
  }, []);

  // ── Render the bg canvas (persistent items) ──────────────────────────
  const drawBg = useCallback(() => {
    const canvas = bgCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== Math.round(rect.width * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const v = viewportRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * v.scale, 0, 0, dpr * v.scale, dpr * v.x, dpr * v.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Subtle dotted grid in world space (rendering is invariant under zoom).
    ctx.save();
    ctx.fillStyle = "#e5e7eb";
    const grid = 40;
    const left = -v.x / v.scale;
    const top = -v.y / v.scale;
    const right = left + canvas.width / dpr / v.scale;
    const bottom = top + canvas.height / dpr / v.scale;
    const startX = Math.floor(left / grid) * grid;
    const startY = Math.floor(top / grid) * grid;
    for (let x = startX; x <= right; x += grid) {
      for (let y = startY; y <= bottom; y += grid) {
        ctx.beginPath();
        ctx.arc(x, y, 1 / v.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Items in z-order.
    for (const id of itemOrderRef.current) {
      const it = itemsRef.current.get(id);
      if (!it) continue;
      drawItem(ctx, it);
    }

    // Selection halos.
    if (selectedRef.current.size > 0) {
      ctx.save();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = Math.max(1, 1.5 / v.scale);
      ctx.setLineDash([6 / v.scale, 4 / v.scale]);
      for (const id of selectedRef.current) {
        const it = itemsRef.current.get(id);
        if (!it) continue;
        const b = itemBounds(it);
        const pad = 4 / v.scale;
        ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
      }
      ctx.restore();
    }
  }, []);

  // ── Live canvas redraw (in-flight stroke / shape / pan-marker) ──
  const liveStateRef = useRef<{
    inflight: Item | null;
    selectionRect: { from: Point; to: Point } | null;
  }>({ inflight: null, selectionRect: null });

  const drawLive = useCallback(() => {
    const canvas = liveCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(rect.width * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const v = viewportRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * v.scale, 0, 0, dpr * v.scale, dpr * v.x, dpr * v.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (liveStateRef.current.inflight) {
      drawItem(ctx, liveStateRef.current.inflight);
    }

    if (liveStateRef.current.selectionRect) {
      const r = liveStateRef.current.selectionRect;
      const x = Math.min(r.from.x, r.to.x);
      const y = Math.min(r.from.y, r.to.y);
      const w = Math.abs(r.to.x - r.from.x);
      const h = Math.abs(r.to.y - r.from.y);
      ctx.save();
      ctx.fillStyle = "rgba(37, 99, 235, 0.10)";
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1 / v.scale;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  }, []);

  // ── ResizeObserver: redraw when container size changes ──────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      drawBg();
      drawLive();
    });
    ro.observe(el);
    drawBg();
    drawLive();
    return () => ro.disconnect();
  }, [drawBg, drawLive]);

  // ── Network listener ─────────────────────────────────────────────────
  const snapshotPending = useRef(false);
  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      _participant?: RemoteParticipant
    ) => {
      let msg: { type?: string } & Record<string, unknown>;
      try {
        msg = JSON.parse(dec.decode(payload));
      } catch {
        return;
      }
      if (!msg.type || !String(msg.type).startsWith("wb2_")) return;

      if (msg.type === "wb2_add" && msg.item) {
        const it = msg.item as Item;
        if (!itemsRef.current.has(it.id)) {
          itemsRef.current.set(it.id, it);
          itemOrderRef.current.push(it.id);
          drawBg();
        }
      } else if (msg.type === "wb2_update" && msg.id && msg.changes) {
        const cur = itemsRef.current.get(msg.id as string);
        if (cur) {
          itemsRef.current.set(msg.id as string, { ...cur, ...(msg.changes as Partial<Item>) } as Item);
          drawBg();
        }
      } else if (msg.type === "wb2_delete" && msg.id) {
        if (itemsRef.current.delete(msg.id as string)) {
          itemOrderRef.current = itemOrderRef.current.filter((x) => x !== msg.id);
          selectedRef.current.delete(msg.id as string);
          setSelectedCount(selectedRef.current.size);
          drawBg();
        }
      } else if (msg.type === "wb2_clear") {
        itemsRef.current.clear();
        itemOrderRef.current = [];
        selectedRef.current.clear();
        setSelectedCount(0);
        drawBg();
      } else if (msg.type === "wb2_request") {
        if (snapshotPending.current) return;
        snapshotPending.current = true;
        setTimeout(() => {
          const items = itemOrderRef.current
            .map((id) => itemsRef.current.get(id))
            .filter((x): x is Item => !!x);
          broadcast(
            (d, o) => room.localParticipant.publishData(d, o),
            { type: "wb2_snapshot", items }
          );
          snapshotPending.current = false;
        }, Math.floor(Math.random() * 250));
      } else if (msg.type === "wb2_snapshot" && Array.isArray(msg.items)) {
        // Only adopt the snapshot if our state is empty — otherwise we'd
        // overwrite local edits made during the handshake window.
        if (itemsRef.current.size === 0) {
          for (const it of msg.items as Item[]) {
            itemsRef.current.set(it.id, it);
            itemOrderRef.current.push(it.id);
          }
          drawBg();
        }
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    // Ask peers for the current state on mount.
    broadcast(
      (d, o) => room.localParticipant.publishData(d, o),
      { type: "wb2_request" }
    );
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, drawBg]);

  // ── Pointer handling ─────────────────────────────────────────────────
  type DragState =
    | { kind: "stroke"; item: StrokeItem }
    | { kind: "shape"; item: ShapeItem; from: Point }
    | { kind: "select"; from: Point }
    | { kind: "move"; from: Point; originals: Map<string, Item> }
    | { kind: "pan"; sx: number; sy: number; vx: number; vy: number }
    | null;
  const dragRef = useRef<DragState>(null);

  const publish = useCallback(
    (msg: object) => broadcast((d, o) => room.localParticipant.publishData(d, o), msg),
    [room]
  );

  const pushHistory = (action: HistoryAction) => {
    historyRef.current.push(action);
    if (historyRef.current.length > 100) historyRef.current.shift();
    futureRef.current = [];
  };

  const commitItem = (it: Item) => {
    itemsRef.current.set(it.id, it);
    itemOrderRef.current.push(it.id);
    pushHistory({ kind: "add", item: it });
    publish({ type: "wb2_add", item: it });
    drawBg();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (editing) return; // text input has focus, don't capture
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);

    // Pan: middle mouse OR space-held OR pan tool
    if (e.button === 1 || tool === "pan") {
      const v = viewportRef.current;
      dragRef.current = { kind: "pan", sx, sy, vx: v.x, vy: v.y };
      return;
    }

    if (tool === "pen" || tool === "highlighter") {
      const stroke: StrokeItem = {
        id: newId(),
        type: "stroke",
        tool,
        color,
        thickness: tool === "highlighter" ? Math.max(thickness, 12) : thickness,
        points: [{ x: w.x, y: w.y, p: e.pressure || 0.5 }],
      };
      liveStateRef.current.inflight = stroke;
      dragRef.current = { kind: "stroke", item: stroke };
      drawLive();
      return;
    }

    if (tool === "rect" || tool === "ellipse" || tool === "line" || tool === "arrow") {
      const sh: ShapeItem = {
        id: newId(),
        type: "shape",
        shape: tool,
        color,
        thickness,
        from: w,
        to: w,
      };
      liveStateRef.current.inflight = sh;
      dragRef.current = { kind: "shape", item: sh, from: w };
      drawLive();
      return;
    }

    if (tool === "eraser") {
      // Hit-test items at this point and delete in one pass.
      eraseAt(w);
      dragRef.current = { kind: "stroke", item: { id: "_eraser_", type: "stroke", tool: "pen", color: "transparent", thickness: 0, points: [] } };
      return;
    }

    if (tool === "text") {
      const id = newId();
      const it: TextItem = { id, type: "text", color, size: Math.max(thickness * 4, 18), text: "", pos: w };
      itemsRef.current.set(id, it);
      itemOrderRef.current.push(id);
      setEditing({ id, kind: "text" });
      drawBg();
      return;
    }

    if (tool === "sticky") {
      const id = newId();
      const it: StickyItem = {
        id,
        type: "sticky",
        color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
        text: "",
        pos: w,
        width: 180,
        height: 140,
      };
      itemsRef.current.set(id, it);
      itemOrderRef.current.push(id);
      setEditing({ id, kind: "sticky" });
      drawBg();
      return;
    }

    if (tool === "select") {
      // Click on existing item → select it (replace selection unless shift).
      const hit = hitTest(w);
      if (hit) {
        if (!e.shiftKey) selectedRef.current.clear();
        if (selectedRef.current.has(hit.id) && e.shiftKey) {
          selectedRef.current.delete(hit.id);
        } else {
          selectedRef.current.add(hit.id);
        }
        setSelectedCount(selectedRef.current.size);
        const originals = new Map<string, Item>();
        for (const id of selectedRef.current) {
          const it = itemsRef.current.get(id);
          if (it) originals.set(id, structuredClone(it));
        }
        dragRef.current = { kind: "move", from: w, originals };
        drawBg();
      } else {
        if (!e.shiftKey) {
          selectedRef.current.clear();
          setSelectedCount(0);
        }
        liveStateRef.current.selectionRect = { from: w, to: w };
        dragRef.current = { kind: "select", from: w };
        drawBg();
        drawLive();
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Use coalesced events for dense sampling on stylus.
    const events =
      typeof e.nativeEvent.getCoalescedEvents === "function"
        ? e.nativeEvent.getCoalescedEvents()
        : [e.nativeEvent];

    if (drag.kind === "pan") {
      const last = events[events.length - 1];
      const sx = last.clientX - rect.left;
      const sy = last.clientY - rect.top;
      viewportRef.current = {
        ...viewportRef.current,
        x: drag.vx + (sx - drag.sx),
        y: drag.vy + (sy - drag.sy),
      };
      drawBg();
      drawLive();
      return;
    }

    if (drag.kind === "stroke" && drag.item.id !== "_eraser_") {
      for (const ev of events) {
        const sx = ev.clientX - rect.left;
        const sy = ev.clientY - rect.top;
        const w = screenToWorld(sx, sy);
        drag.item.points.push({ x: w.x, y: w.y, p: ev.pressure || 0.5 });
      }
      drawLive();
      return;
    }

    if (drag.kind === "stroke" && drag.item.id === "_eraser_") {
      // Erase along the path.
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      eraseAt(screenToWorld(sx, sy));
      return;
    }

    if (drag.kind === "shape") {
      const last = events[events.length - 1];
      const sx = last.clientX - rect.left;
      const sy = last.clientY - rect.top;
      drag.item.to = screenToWorld(sx, sy);
      drawLive();
      return;
    }

    if (drag.kind === "select") {
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      liveStateRef.current.selectionRect = {
        from: drag.from,
        to: screenToWorld(sx, sy),
      };
      drawLive();
      return;
    }

    if (drag.kind === "move") {
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const w = screenToWorld(sx, sy);
      const dx = w.x - drag.from.x;
      const dy = w.y - drag.from.y;
      for (const [id, original] of drag.originals) {
        itemsRef.current.set(id, translateItem(original, dx, dy));
      }
      drawBg();
      return;
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    liveStateRef.current.inflight = null;
    liveStateRef.current.selectionRect = null;
    drawLive();

    if (!drag) return;

    if (drag.kind === "stroke" && drag.item.id !== "_eraser_") {
      // Drop near-duplicate consecutive samples.
      const cleaned = drag.item.points.filter((p, i, arr) => {
        if (i === 0) return true;
        const prev = arr[i - 1];
        return Math.hypot(p.x - prev.x, p.y - prev.y) > 0.5;
      });
      drag.item.points = cleaned.length >= 2 ? cleaned : drag.item.points;
      commitItem(drag.item);
      return;
    }

    if (drag.kind === "shape") {
      // Discard zero-size shapes (accidental click).
      const w = Math.abs(drag.item.to.x - drag.item.from.x);
      const h = Math.abs(drag.item.to.y - drag.item.from.y);
      if (w < 4 && h < 4) return;
      commitItem(drag.item);
      return;
    }

    if (drag.kind === "select") {
      // Lasso-rect select: any item whose center is inside the rect.
      const r = liveStateRef.current.selectionRect ?? { from: drag.from, to: drag.from };
      const rx = Math.min(r.from.x, r.to.x);
      const ry = Math.min(r.from.y, r.to.y);
      const rw = Math.abs(r.to.x - r.from.x);
      const rh = Math.abs(r.to.y - r.from.y);
      if (rw > 4 && rh > 4) {
        for (const id of itemOrderRef.current) {
          const it = itemsRef.current.get(id);
          if (!it) continue;
          const b = itemBounds(it);
          const cx = b.x + b.w / 2;
          const cy = b.y + b.h / 2;
          if (cx >= rx && cx <= rx + rw && cy >= ry && cy <= ry + rh) {
            selectedRef.current.add(id);
          }
        }
        setSelectedCount(selectedRef.current.size);
        drawBg();
      }
      return;
    }

    if (drag.kind === "move") {
      // Broadcast each moved item's new state.
      for (const [id] of drag.originals) {
        const cur = itemsRef.current.get(id);
        if (cur) publish({ type: "wb2_update", id, changes: cur });
      }
      // History: bundle per-item before/after.
      for (const [id, before] of drag.originals) {
        const after = itemsRef.current.get(id);
        if (after) pushHistory({ kind: "update", before, after });
      }
      return;
    }
  };

  // ── Helpers used by handlers ──────────────────────────────────────────
  const eraseAt = (w: Point) => {
    const radius = thickness;
    let touched = false;
    for (const id of [...itemOrderRef.current].reverse()) {
      const it = itemsRef.current.get(id);
      if (!it) continue;
      const b = itemBounds(it);
      if (
        w.x < b.x - radius ||
        w.x > b.x + b.w + radius ||
        w.y < b.y - radius ||
        w.y > b.y + b.h + radius
      ) {
        continue;
      }
      let hit = false;
      if (it.type === "stroke") hit = strokeHit(it, w, radius);
      else hit = pointInBounds(w, b);
      if (hit) {
        itemsRef.current.delete(id);
        itemOrderRef.current = itemOrderRef.current.filter((x) => x !== id);
        selectedRef.current.delete(id);
        pushHistory({ kind: "delete", item: it });
        publish({ type: "wb2_delete", id });
        touched = true;
      }
    }
    if (touched) {
      setSelectedCount(selectedRef.current.size);
      drawBg();
    }
  };

  const hitTest = (w: Point): Item | null => {
    for (const id of [...itemOrderRef.current].reverse()) {
      const it = itemsRef.current.get(id);
      if (!it) continue;
      if (it.type === "stroke" && strokeHit(it, w, 8)) return it;
      if (pointInBounds(w, itemBounds(it))) return it;
    }
    return null;
  };

  const translateItem = (it: Item, dx: number, dy: number): Item => {
    if (it.type === "stroke") return { ...it, points: it.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) };
    if (it.type === "shape") return { ...it, from: { ...it.from, x: it.from.x + dx, y: it.from.y + dy }, to: { ...it.to, x: it.to.x + dx, y: it.to.y + dy } };
    return { ...it, pos: { ...it.pos, x: it.pos.x + dx, y: it.pos.y + dy } };
  };

  // ── Wheel zoom ────────────────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 50) return;
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const v = viewportRef.current;
    const factor = Math.exp(-e.deltaY * 0.0015);
    const newScale = Math.max(0.2, Math.min(8, v.scale * factor));
    // Zoom toward cursor.
    const wx = (sx - v.x) / v.scale;
    const wy = (sy - v.y) / v.scale;
    viewportRef.current = {
      x: sx - wx * newScale,
      y: sy - wy * newScale,
      scale: newScale,
    };
    drawBg();
    drawLive();
  };

  // ── Toolbar actions ───────────────────────────────────────────────────
  const undo = () => {
    const a = historyRef.current.pop();
    if (!a) return;
    futureRef.current.push(a);
    if (a.kind === "add") {
      itemsRef.current.delete(a.item.id);
      itemOrderRef.current = itemOrderRef.current.filter((x) => x !== a.item.id);
      publish({ type: "wb2_delete", id: a.item.id });
    } else if (a.kind === "delete") {
      itemsRef.current.set(a.item.id, a.item);
      itemOrderRef.current.push(a.item.id);
      publish({ type: "wb2_add", item: a.item });
    } else if (a.kind === "update") {
      itemsRef.current.set(a.before.id, a.before);
      publish({ type: "wb2_update", id: a.before.id, changes: a.before });
    } else if (a.kind === "clear") {
      for (const it of a.items) {
        itemsRef.current.set(it.id, it);
        itemOrderRef.current.push(it.id);
        publish({ type: "wb2_add", item: it });
      }
    }
    selectedRef.current.clear();
    setSelectedCount(0);
    drawBg();
  };

  const redo = () => {
    const a = futureRef.current.pop();
    if (!a) return;
    historyRef.current.push(a);
    if (a.kind === "add") {
      itemsRef.current.set(a.item.id, a.item);
      itemOrderRef.current.push(a.item.id);
      publish({ type: "wb2_add", item: a.item });
    } else if (a.kind === "delete") {
      itemsRef.current.delete(a.item.id);
      itemOrderRef.current = itemOrderRef.current.filter((x) => x !== a.item.id);
      publish({ type: "wb2_delete", id: a.item.id });
    } else if (a.kind === "update") {
      itemsRef.current.set(a.after.id, a.after);
      publish({ type: "wb2_update", id: a.after.id, changes: a.after });
    } else if (a.kind === "clear") {
      itemsRef.current.clear();
      itemOrderRef.current = [];
      publish({ type: "wb2_clear" });
    }
    selectedRef.current.clear();
    setSelectedCount(0);
    drawBg();
  };

  const clearAll = () => {
    if (itemsRef.current.size === 0) return;
    if (!window.confirm("Effacer tout le tableau ?")) return;
    const items = Array.from(itemsRef.current.values());
    pushHistory({ kind: "clear", items });
    itemsRef.current.clear();
    itemOrderRef.current = [];
    selectedRef.current.clear();
    setSelectedCount(0);
    publish({ type: "wb2_clear" });
    drawBg();
  };

  const deleteSelected = () => {
    if (selectedRef.current.size === 0) return;
    for (const id of selectedRef.current) {
      const it = itemsRef.current.get(id);
      if (!it) continue;
      pushHistory({ kind: "delete", item: it });
      itemsRef.current.delete(id);
      itemOrderRef.current = itemOrderRef.current.filter((x) => x !== id);
      publish({ type: "wb2_delete", id });
    }
    selectedRef.current.clear();
    setSelectedCount(0);
    drawBg();
  };

  const resetViewport = () => {
    viewportRef.current = { x: 0, y: 0, scale: 1 };
    drawBg();
    drawLive();
  };

  const zoom = (factor: number) => {
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const v = viewportRef.current;
    const newScale = Math.max(0.2, Math.min(8, v.scale * factor));
    const wx = (cx - v.x) / v.scale;
    const wy = (cy - v.y) / v.scale;
    viewportRef.current = { x: cx - wx * newScale, y: cy - wy * newScale, scale: newScale };
    drawBg();
    drawLive();
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Escape") {
        selectedRef.current.clear();
        setSelectedCount(0);
        drawBg();
        return;
      }
      // Tool shortcuts (no modifier)
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        const map: Record<string, Tool> = {
          v: "select", p: "pen", h: "highlighter", e: "eraser",
          r: "rect", o: "ellipse", l: "line", a: "arrow",
          t: "text", s: "sticky", " ": "pan",
        };
        const next = map[e.key.toLowerCase()];
        if (next) {
          e.preventDefault();
          setTool(next);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, undo, redo, drawBg]);

  // ── Editing overlay (text + sticky) ──────────────────────────────────
  const editingItem = editing ? itemsRef.current.get(editing.id) : null;
  const editingScreenPos = useMemo(() => {
    if (!editingItem) return null;
    const v = viewportRef.current;
    if (editingItem.type === "text") {
      return {
        x: editingItem.pos.x * v.scale + v.x,
        y: editingItem.pos.y * v.scale + v.y,
        width: 240,
        height: editingItem.size * 2,
        scale: v.scale,
      };
    }
    if (editingItem.type === "sticky") {
      return {
        x: editingItem.pos.x * v.scale + v.x,
        y: editingItem.pos.y * v.scale + v.y,
        width: editingItem.width * v.scale,
        height: editingItem.height * v.scale,
        scale: v.scale,
      };
    }
    return null;
  }, [editingItem]);

  const finishEditing = (text: string) => {
    if (!editing) return;
    const it = itemsRef.current.get(editing.id);
    if (!it) {
      setEditing(null);
      return;
    }
    if (text.trim() === "") {
      itemsRef.current.delete(editing.id);
      itemOrderRef.current = itemOrderRef.current.filter((x) => x !== editing.id);
    } else if (it.type === "text" || it.type === "sticky") {
      const updated = { ...it, text };
      itemsRef.current.set(editing.id, updated);
      pushHistory({ kind: "add", item: updated });
      publish({ type: "wb2_add", item: updated });
    }
    setEditing(null);
    drawBg();
  };

  // ── Toolbar UI ────────────────────────────────────────────────────────
  const toolButton = (t: Tool, Icon: React.ElementType, title: string) => (
    <button
      key={t}
      type="button"
      onClick={() => setTool(t)}
      title={title}
      className={`flex size-9 items-center justify-center rounded-md transition-colors ${
        tool === t
          ? "bg-[var(--ev-blue)] text-white"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <Icon className="size-4" />
    </button>
  );

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      {/* Close button — pinned top-right of the whiteboard, outside the
          toolbar's flex flow so it never gets clipped by overflow at any
          viewport. Distinct rose styling so the "exit" affordance is
          obvious among 25+ slate-700 toolbar buttons. */}
      <button
        type="button"
        onClick={onClose}
        title="Fermer le tableau"
        aria-label="Fermer le tableau blanc"
        className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600 shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-700"
      >
        <X className="size-4" />
      </button>

      {/* Top header — flex-wrap so on narrow viewports buttons wrap to a
          second row instead of overflowing off-screen. pr-12 reserves
          space for the absolute-positioned X close button. */}
      <div className="flex flex-wrap items-center gap-1 gap-y-1 border-b border-slate-200 bg-white px-3 py-2 pr-12">
        <div className="flex items-center gap-1">
          {toolButton("select", MousePointer2, "Sélectionner (V)")}
          {toolButton("pan", Hand, "Déplacer la vue (Espace)")}
          <div className="mx-1 h-6 w-px bg-slate-200" />
          {toolButton("pen", Pen, "Stylo (P)")}
          {toolButton("highlighter", Highlighter, "Surligneur (H)")}
          {toolButton("eraser", Eraser, "Gomme (E)")}
          <div className="mx-1 h-6 w-px bg-slate-200" />
          {toolButton("rect", Square, "Rectangle (R)")}
          {toolButton("ellipse", Circle, "Ellipse (O)")}
          {toolButton("line", Slash, "Ligne (L)")}
          {toolButton("arrow", ArrowUpRight, "Flèche (A)")}
          <div className="mx-1 h-6 w-px bg-slate-200" />
          {toolButton("text", Type, "Texte (T)")}
          {toolButton("sticky", StickyNote, "Note (S)")}
        </div>

        <div className="flex items-center gap-1">
          {/* Color palette */}
          <div className="flex items-center gap-1 rounded-md border border-slate-200 px-1 py-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Couleur ${c}`}
                className={`size-6 rounded-full border-2 transition-transform ${
                  color === c ? "scale-110 border-slate-800" : "border-white"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
          {/* Thickness */}
          <div className="flex items-center gap-1 rounded-md border border-slate-200 px-1 py-1">
            {THICKNESS_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setThickness(t)}
                title={`Épaisseur ${t}px`}
                className={`flex size-6 items-center justify-center rounded transition-colors ${
                  thickness === t ? "bg-slate-200" : "hover:bg-slate-100"
                }`}
              >
                <span
                  className="rounded-full bg-slate-800"
                  style={{ width: `${Math.min(t, 14)}px`, height: `${Math.min(t, 14)}px` }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* ml-auto pushes the utility group flush right when the toolbar
            fits on one row. When wrapping, it sits at the start of its
            own row — also fine since every button stays reachable. */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={historyRef.current.length === 0}
            title="Annuler (Ctrl+Z)"
            className="flex size-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={futureRef.current.length === 0}
            title="Rétablir (Ctrl+Y)"
            className="flex size-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <Redo2 className="size-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => zoom(0.85)}
            title="Zoom arrière"
            className="flex size-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => zoom(1.18)}
            title="Zoom avant"
            className="flex size-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={resetViewport}
            title="Recentrer"
            className="flex size-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
          >
            <Maximize className="size-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-slate-200" />
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={deleteSelected}
              title={`Supprimer (${selectedCount})`}
              className="flex h-9 items-center gap-1 rounded-md px-3 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="size-4" />
              <span className="text-xs font-medium">{selectedCount}</span>
            </button>
          )}
          <button
            type="button"
            onClick={clearAll}
            title="Tout effacer"
            className="flex size-9 items-center justify-center rounded-md text-slate-700 hover:bg-rose-50 hover:text-rose-700"
          >
            <Download className="size-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-white"
        style={{
          cursor:
            tool === "pan" ? "grab" :
            tool === "select" ? "default" :
            tool === "eraser" ? "cell" :
            tool === "text" || tool === "sticky" ? "text" :
            "crosshair",
          touchAction: "none",
        }}
      >
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
        />
        <canvas
          ref={liveCanvasRef}
          className="absolute inset-0"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
        />

        {editing && editingItem && editingScreenPos && (editingItem.type === "text" || editingItem.type === "sticky") && (
          <textarea
            autoFocus
            defaultValue={editingItem.text}
            onBlur={(e) => finishEditing(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.blur();
              }
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.currentTarget.blur();
              }
            }}
            style={{
              position: "absolute",
              left: editingScreenPos.x + (editingItem.type === "sticky" ? 12 * editingScreenPos.scale : 0),
              top: editingScreenPos.y + (editingItem.type === "sticky" ? 12 * editingScreenPos.scale : 0),
              width: editingScreenPos.width - (editingItem.type === "sticky" ? 24 * editingScreenPos.scale : 0),
              minHeight: editingScreenPos.height - (editingItem.type === "sticky" ? 24 * editingScreenPos.scale : 0),
              fontSize: editingItem.type === "text"
                ? editingItem.size * editingScreenPos.scale
                : 16 * editingScreenPos.scale,
              fontFamily: "sans-serif",
              color: editingItem.type === "text" ? editingItem.color : "#0f172a",
              background: editingItem.type === "text" ? "transparent" : "transparent",
              border: editingItem.type === "text" ? "1px dashed #94a3b8" : "none",
              outline: "none",
              resize: "none",
              padding: editingItem.type === "text" ? 4 : 0,
              lineHeight: 1.25,
            }}
          />
        )}

        <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-slate-900/70 px-2 py-1 text-xs text-white">
          {Math.round(viewportRef.current.scale * 100)}%
        </div>
      </div>
    </div>
  );
}
