"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type DataPublishOptions } from "livekit-client";
import { Pen, Eraser, Trash2, X } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  tool: "pen" | "eraser";
}

interface WhiteboardProps {
  onClose: () => void;
}

const COLORS = ["#000000", "#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number) {
  if (stroke.points.length < 2) return;
  ctx.beginPath();
  ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
  ctx.lineWidth = stroke.tool === "eraser" ? stroke.width * 4 : stroke.width;
  ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
  }
  ctx.stroke();
}

export function Whiteboard({ onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const room = useRoomContext();

  // Redraw helper that closes over strokesRef
  const redraw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke, w, h);
    }
  }, []);

  // Resize canvas to fit container
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
        redraw(ctx, rect.width, rect.height);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw]);

  // Listen for remote strokes
  useEffect(() => {
    const handler = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === "whiteboard_stroke") {
          const stroke = msg.stroke as Stroke;
          strokesRef.current.push(stroke);
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            const rect = canvas.getBoundingClientRect();
            if (ctx) drawStroke(ctx, stroke, rect.width, rect.height);
          }
        }
        if (msg.type === "whiteboard_clear") {
          strokesRef.current = [];
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            const rect = canvas.getBoundingClientRect();
            if (ctx) ctx.clearRect(0, 0, rect.width, rect.height);
          }
        }
      } catch {
        // ignore
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const point = getPoint(e);
    currentStrokeRef.current = {
      points: [point],
      color,
      width,
      tool,
    };
  }, [color, width, tool]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !currentStrokeRef.current) return;
    const point = getPoint(e);
    currentStrokeRef.current.points.push(point);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      if (ctx && currentStrokeRef.current.points.length >= 2) {
        const pts = currentStrokeRef.current.points;
        const prev = pts[pts.length - 2];
        const curr = pts[pts.length - 1];
        const segment: Stroke = {
          points: [prev, curr],
          color,
          width,
          tool,
        };
        drawStroke(ctx, segment, rect.width, rect.height);
      }
    }
  }, [isDrawing, color, width, tool]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !currentStrokeRef.current) return;
    setIsDrawing(false);
    strokesRef.current.push(currentStrokeRef.current);

    // Broadcast stroke to other participants
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "whiteboard_stroke", stroke: currentStrokeRef.current })
    );
    room.localParticipant.publishData(payload, { reliable: true } as DataPublishOptions);

    currentStrokeRef.current = null;
  }, [isDrawing, room]);

  const clearBoard = () => {
    strokesRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      if (ctx) ctx.clearRect(0, 0, rect.width, rect.height);
    }
    const payload = new TextEncoder().encode(JSON.stringify({ type: "whiteboard_clear" }));
    room.localParticipant.publishData(payload, { reliable: true } as DataPublishOptions);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <button
          onClick={() => setTool("pen")}
          className={`rounded p-1.5 ${tool === "pen" ? "bg-slate-100" : "hover:bg-slate-50"}`}
          title="Stylo"
        >
          <Pen className="size-4" />
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`rounded p-1.5 ${tool === "eraser" ? "bg-slate-100" : "hover:bg-slate-50"}`}
          title="Gomme"
        >
          <Eraser className="size-4" />
        </button>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { setColor(c); setTool("pen"); }}
            className={`size-5 rounded-full border-2 ${color === c && tool === "pen" ? "border-slate-800" : "border-transparent"}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <input
          type="range"
          min={1}
          max={10}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="w-20"
        />
        <div className="flex-1" />
        <button
          onClick={clearBoard}
          className="rounded p-1.5 text-red-500 hover:bg-red-50"
          title="Effacer tout"
        >
          <Trash2 className="size-4" />
        </button>
        <button
          onClick={onClose}
          className="rounded p-1.5 hover:bg-slate-100"
          title="Fermer"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 touch-none cursor-crosshair"
          style={{ touchAction: "none" }}
        />
      </div>
    </div>
  );
}
