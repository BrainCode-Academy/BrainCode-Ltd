import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Circle,
  Download,
  Eraser,
  Highlighter,
  Maximize2,
  Minimize2,
  Minus,
  PenTool,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';

type WhiteboardTool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow' | 'text';

interface Point {
  x: number;
  y: number;
}

interface WhiteboardStroke {
  id: string;
  tool: WhiteboardTool;
  color: string;
  width: number;
  points: Point[];
  text?: string;
}

interface InteractiveWhiteboardProps {
  courseId: string;
  courseTitle: string;
  lessonTitle?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const PALETTE = ['#0A84FF', '#E11D48', '#10B981', '#F59E0B', '#8B5CF6', '#0F172A', '#F8FAFC'];
const WIDTHS = [2, 4, 8];

export function InteractiveWhiteboard({
  courseId,
  courseTitle,
  lessonTitle,
  isExpanded = false,
  onToggleExpand,
}: InteractiveWhiteboardProps) {
  const storageKey = `bc_whiteboard_${courseId}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState<string>('#0A84FF');
  const [lineWidth, setLineWidth] = useState<number>(4);
  const [darkBoard, setDarkBoard] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore invalid stored state
    }
    return [];
  });
  const [redoStack, setRedoStack] = useState<WhiteboardStroke[]>([]);
  const [draftStroke, setDraftStroke] = useState<WhiteboardStroke | null>(null);
  const [pendingTextPos, setPendingTextPos] = useState<Point | null>(null);
  const [textDraft, setTextDraft] = useState('');

  // Reload whiteboard strokes when switching to a different courseId
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setStrokes(Array.isArray(parsed) ? parsed : []);
    } catch {
      setStrokes([]);
    }
    setRedoStack([]);
    setDraftStroke(null);
    setPendingTextPos(null);
  }, [storageKey]);

  // Persist strokes to localStorage whenever committed
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(strokes));
    } catch {
      // ignore storage quota errors
    }
  }, [strokes, storageKey]);

  const drawSingleStroke = useCallback(
    (ctx: CanvasRenderingContext2D, s: WhiteboardStroke, boardBg: string) => {
      if (s.points.length === 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (s.tool === 'highlighter') {
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = Math.max(12, s.width * 3.5);
      } else if (s.tool === 'eraser') {
        ctx.strokeStyle = boardBg;
        ctx.lineWidth = Math.max(12, s.width * 3);
      } else {
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;
        ctx.lineWidth = s.width;
      }

      if (s.tool === 'text' && s.text) {
        const pt = s.points[0];
        ctx.font = `600 ${Math.max(14, s.width * 3 + 8)}px sans-serif`;
        ctx.fillStyle = s.color;
        ctx.fillText(s.text, pt.x, pt.y);
        ctx.restore();
        return;
      }

      const start = s.points[0];
      const end = s.points[s.points.length - 1];

      if (s.tool === 'pen' || s.tool === 'highlighter' || s.tool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        if (s.points.length === 1) {
          ctx.lineTo(start.x + 0.01, start.y + 0.01);
        } else {
          for (let i = 1; i < s.points.length; i++) {
            ctx.lineTo(s.points[i].x, s.points[i].y);
          }
        }
        ctx.stroke();
      } else if (s.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else if (s.tool === 'rect') {
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (s.tool === 'circle') {
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.tool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = Math.max(10, s.width * 2.5);
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }

      ctx.restore();
    },
    []
  );

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = Math.max(260, container.clientWidth);
    const height = isExpanded ? 520 : 360;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const boardBg = darkBoard ? '#0B1220' : '#FFFFFF';
    ctx.fillStyle = boardBg;
    ctx.fillRect(0, 0, width, height);

    // Subtle notebook grid
    ctx.strokeStyle = darkBoard ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)';
    ctx.lineWidth = 1;
    const step = 24;
    ctx.beginPath();
    for (let x = step; x < width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = step; y < height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    for (const s of strokes) {
      drawSingleStroke(ctx, s, boardBg);
    }
    if (draftStroke) {
      drawSingleStroke(ctx, draftStroke, boardBg);
    }
  }, [strokes, draftStroke, darkBoard, isExpanded, drawSingleStroke]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => redrawCanvas());
    ro.observe(el);
    return () => ro.disconnect();
  }, [redrawCanvas]);

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) * 10) / 10,
      y: Math.round((e.clientY - rect.top) * 10) / 10,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const pos = getPointerPos(e);

    if (tool === 'text') {
      setPendingTextPos(pos);
      setTextDraft('');
      return;
    }

    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDraftStroke({
      id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tool,
      color,
      width: lineWidth,
      points: [pos],
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draftStroke) return;
    const pos = getPointerPos(e);
    setDraftStroke((prev) => {
      if (!prev) return null;
      if (prev.tool === 'pen' || prev.tool === 'highlighter' || prev.tool === 'eraser') {
        return { ...prev, points: [...prev.points, pos] };
      }
      return { ...prev, points: [prev.points[0], pos] };
    });
  };

  const finishStroke = () => {
    if (!draftStroke) return;
    setStrokes((prev) => [...prev, draftStroke]);
    setRedoStack([]);
    setDraftStroke(null);
  };

  const commitTextAnnotation = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!pendingTextPos || !textDraft.trim()) {
      setPendingTextPos(null);
      return;
    }
    const newStroke: WhiteboardStroke = {
      id: `txt_${Date.now()}`,
      tool: 'text',
      color,
      width: lineWidth,
      points: [pendingTextPos],
      text: textDraft.trim(),
    };
    setStrokes((prev) => [...prev, newStroke]);
    setRedoStack([]);
    setPendingTextPos(null);
    setTextDraft('');
  };

  const handleUndo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      setStrokes((s) => [...s, restored]);
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    setDraftStroke(null);
    setPendingTextPos(null);
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-whiteboard.png`;
    a.click();
  };

  const tools: Array<{ id: WhiteboardTool; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'pen', label: 'Pen', icon: PenTool },
    { id: 'highlighter', label: 'Highlight', icon: Highlighter },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'line', label: 'Line', icon: Minus },
    { id: 'rect', label: 'Box', icon: Square },
    { id: 'circle', label: 'Circle', icon: Circle },
    { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
    { id: 'text', label: 'Text', icon: Type },
  ];

  return (
    <div className="space-y-3" data-testid="interactive-whiteboard">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-default)]">
        <div className="flex flex-wrap items-center gap-1">
          {tools.map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-label={`Whiteboard tool: ${t.label}`}
                title={t.label}
                onClick={() => setTool(t.id)}
                className={`h-8 px-2 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#0A84FF] text-white'
                    : 'border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Color Palette */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg border border-[var(--border-default)]">
            {PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Select color ${swatch}`}
                onClick={() => setColor(swatch)}
                className={`w-4 h-4 rounded-full cursor-pointer border ${
                  color === swatch ? 'ring-2 ring-offset-1 ring-[#0A84FF] border-white' : 'border-[var(--border-strong)]'
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>

          {/* Width Selector */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-[var(--border-default)]">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                aria-label={`Stroke width ${w}px`}
                onClick={() => setLineWidth(w)}
                className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer ${
                  lineWidth === w ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-bold' : 'text-[var(--text-muted)]'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="text-[var(--text-secondary)] truncate max-w-full sm:max-w-[280px]">
          {lessonTitle ? `Diagram Notes · ${lessonTitle}` : `Sketchpad · ${courseTitle}`}
          <span className="ml-2 font-mono tabular-nums text-[var(--text-muted)]">({strokes.length} strokes saved)</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDarkBoard((d) => !d)}
            className="h-7 px-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer whitespace-nowrap"
          >
            {darkBoard ? 'Light Canvas' : 'Dark Canvas'}
          </button>
          <button
            type="button"
            disabled={strokes.length === 0}
            onClick={handleUndo}
            aria-label="Undo whiteboard stroke"
            className="h-7 px-2 rounded-lg border border-[var(--border-default)] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            disabled={redoStack.length === 0}
            onClick={handleRedo}
            aria-label="Redo whiteboard stroke"
            className="h-7 px-2 rounded-lg border border-[var(--border-default)] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Redo</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear whiteboard"
            className="h-7 px-2 rounded-lg border border-[var(--border-default)] inline-flex items-center gap-1 text-[var(--status-danger)] cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
          <button
            type="button"
            onClick={exportPng}
            aria-label="Export whiteboard PNG"
            className="h-7 px-2 rounded-lg border border-[#0A84FF]/40 bg-[var(--accent-soft)] text-[#0A84FF] dark:text-[#38BDF8] inline-flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label={isExpanded ? 'Compact whiteboard' : 'Expand whiteboard'}
              className="h-7 px-2 rounded-lg border border-[var(--border-default)] inline-flex items-center gap-1 cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Interactive Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-xl border border-[var(--border-default)] overflow-hidden touch-none select-none"
      >
        <canvas
          ref={canvasRef}
          data-testid="whiteboard-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          className="block w-full cursor-crosshair"
        />

        {pendingTextPos && (
          <form
            onSubmit={commitTextAnnotation}
            style={{
              left: `${Math.min(Math.max(8, pendingTextPos.x), 200)}px`,
              top: `${Math.max(8, pendingTextPos.y - 16)}px`,
            }}
            className="absolute z-20 flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-lg border border-[#0A84FF] shadow-[var(--shadow-popover)]"
          >
            <input
              type="text"
              autoFocus
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              placeholder="Label text..."
              className="h-7 w-32 sm:w-36 px-2 text-xs rounded border border-[var(--border-default)] bg-transparent text-[var(--text-primary)] focus:outline-none"
            />
            <button
              type="submit"
              className="h-7 px-2 rounded bg-[#0A84FF] text-white text-[11px] font-semibold cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setPendingTextPos(null)}
              className="h-7 px-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[11px] cursor-pointer"
            >
              Esc
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
