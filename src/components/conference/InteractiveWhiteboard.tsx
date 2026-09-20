import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Type,
  RotateCcw,
  Download,
  Image as ImageIcon,
  Grid,
  Maximize2,
  X,
} from 'lucide-react';

interface InteractiveWhiteboardProps {
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  onClose?: () => void;
}

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'line' | 'arrow' | 'text';
type BgType = 'dark' | 'grid' | 'lined' | 'white';

const COLORS = [
  '#ffffff', // White (for dark board)
  '#38bdf8', // Sky Blue
  '#4ade80', // Emerald Green
  '#f87171', // Coral Red
  '#facc15', // Yellow
  '#c084fc', // Purple
  '#0f172a', // Slate Dark
];

export const InteractiveWhiteboard: React.FC<InteractiveWhiteboardProps> = ({
  onCanvasReady,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#ffffff');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [bgType, setBgType] = useState<BgType>('dark');
  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas size and background
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(800, Math.floor(rect.width));
    const height = Math.max(500, Math.floor(rect.height));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background based on theme
    if (bgType === 'dark') {
      ctx.fillStyle = '#0f172a'; // Slate 900
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'white') {
      ctx.fillStyle = '#f8fafc'; // Slate 50
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'grid') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const step = 30;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (bgType === 'lined') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      const step = 36;
      for (let y = 40; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Default line caps
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    onCanvasReady(canvas);
  }, [bgType, onCanvasReady]);

  useEffect(() => {
    initCanvas();
    const handleResize = () => {
      // Re-init canvas on window resize
      initCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'text') {
      setTextPos(coords);
      setIsTyping(true);
      return;
    }

    isDrawingRef.current = true;
    lastPointRef.current = coords;
    startPointRef.current = coords;

    // Save snapshot for shapes preview
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (currentTool === 'pen' || currentTool === 'highlighter' || currentTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const handleMoveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const coords = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'pen') {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 1.0;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastPointRef.current = coords;
    } else if (currentTool === 'highlighter') {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth * 4;
      ctx.globalAlpha = 0.35;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastPointRef.current = coords;
    } else if (currentTool === 'eraser') {
      ctx.strokeStyle = bgType === 'white' ? '#f8fafc' : '#0f172a';
      ctx.lineWidth = lineWidth * 5;
      ctx.globalAlpha = 1.0;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastPointRef.current = coords;
    } else if (snapshotRef.current && startPointRef.current) {
      // Shape preview - restore snapshot
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 1.0;
      const start = startPointRef.current;

      if (currentTool === 'rect') {
        ctx.strokeRect(start.x, start.y, coords.x - start.x, coords.y - start.y);
      } else if (currentTool === 'circle') {
        const radius = Math.hypot(coords.x - start.x, coords.y - start.y);
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (currentTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (currentTool === 'arrow') {
        drawArrow(ctx, start.x, start.y, coords.x, coords.y);
      }
    }
  };

  const handleEndDraw = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    startPointRef.current = null;
    snapshotRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.globalAlpha = 1.0;
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLen = 14;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const handleApplyText = () => {
    if (!textPos || !textInput.trim()) {
      setIsTyping(false);
      setTextInput('');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = 'bold 20px Vazirmatn, Tahoma, sans-serif';
    ctx.fillStyle = currentColor;
    ctx.fillText(textInput, textPos.x, textPos.y);

    setIsTyping(false);
    setTextInput('');
    setTextPos(null);
  };

  const handleClearBoard = () => {
    initCanvas();
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Scale image to fit neatly on canvas
          const maxWidth = canvas.width * 0.75;
          const maxHeight = canvas.height * 0.75;
          let w = img.width;
          let h = img.height;
          if (w > maxWidth || h > maxHeight) {
            const ratio = Math.min(maxWidth / w, maxHeight / h);
            w *= ratio;
            h *= ratio;
          }
          const posX = (canvas.width - w) / 2;
          const posY = (canvas.height - h) / 2;
          ctx.drawImage(img, posX, posY, w, h);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-slate-900 overflow-hidden select-none"
    >
      {/* 1. TOP WHITEBOARD TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-950/95 border-b border-slate-800 text-white z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {/* Tool selectors */}
          <button
            onClick={() => setCurrentTool('pen')}
            className={`p-2 rounded-xl transition ${
              currentTool === 'pen' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="قلم معمولی"
          >
            <Pen className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTool('highlighter')}
            className={`p-2 rounded-xl transition ${
              currentTool === 'highlighter' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="ماژیک هایلایتر"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTool('eraser')}
            className={`p-2 rounded-xl transition ${
              currentTool === 'eraser' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="پاک‌کن"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          {/* Shape selectors */}
          <button
            onClick={() => setCurrentTool('line')}
            className={`p-2 rounded-xl transition ${
              currentTool === 'line' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="خط مستقیم"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTool('arrow')}
            className={`p-2 rounded-xl transition ${
              currentTool === 'arrow' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="فلش اشاره‌گر"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTool('rect')}
            className={`p-2 rounded-xl transition ${
              currentTool === 'rect' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="مستطیل / کادر"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTool('circle')}
            className={`p-2 rounded-xl transition ${
              currentTool === 'circle' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="دایره / بیضی"
          >
            <Circle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTool('text')}
            className={`p-2 rounded-xl transition ${
              currentTool === 'text' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="درج متن یا فرمول"
          >
            <Type className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          {/* Color Palettes */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-xl border border-slate-800">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border-2 transition ${
                  currentColor === c ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
                title={c}
              />
            ))}
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300">
            <span className="text-[10px] text-slate-400">ضخامت:</span>
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  lineWidth === w ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Right side actions: Background, image load, clear */}
        <div className="flex items-center gap-2">
          {/* Background selector */}
          <select
            value={bgType}
            onChange={(e) => setBgType(e.target.value as BgType)}
            className="px-2.5 py-1 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:ring-1 focus:ring-blue-500"
            title="تغییر پس‌زمینه تخته"
          >
            <option value="dark">تخته تیره ساده</option>
            <option value="grid">کاغذ شطرنجی (ریاضی)</option>
            <option value="lined">کاغذ خط‌دار (نگارش)</option>
            <option value="white">تخته سفید کلاسیک</option>
          </select>

          {/* Upload Slide / Image on board */}
          <label
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
            title="درج اسلاید یا عکس درسی روی تخته"
          >
            <ImageIcon className="w-4 h-4" />
            <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
          </label>

          {/* Clear board */}
          <button
            onClick={handleClearBoard}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 text-xs font-bold transition"
            title="پاک‌سازی کامل تخته"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">پاک کردن</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="بستن وایت‌برد"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN DRAWING CANVAS */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStartDraw}
          onMouseMove={handleMoveDraw}
          onMouseUp={handleEndDraw}
          onMouseLeave={handleEndDraw}
          onTouchStart={handleStartDraw}
          onTouchMove={handleMoveDraw}
          onTouchEnd={handleEndDraw}
          className="w-full h-full touch-none"
        />

        {/* Text Input Overlay */}
        {isTyping && textPos && (
          <div
            style={{
              position: 'absolute',
              left: `${textPos.x}px`,
              top: `${textPos.y - 20}px`,
            }}
            className="z-30 bg-slate-900/90 backdrop-blur p-2 rounded-xl border border-blue-500 shadow-2xl flex items-center gap-2"
          >
            <input
              type="text"
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyText();
                if (e.key === 'Escape') setIsTyping(false);
              }}
              placeholder="متن خود را بنویسید و Enter بزنید..."
              className="px-3 py-1 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white focus:ring-1 focus:ring-blue-500 min-w-[240px]"
            />
            <button
              onClick={handleApplyText}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg"
            >
              ثبت
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
