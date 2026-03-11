"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface DrawingCanvasProps {
  onImageReady: (dataUrl: string) => void;
}

export default function DrawingCanvas({ onImageReady }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState("#22c55e");
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [hasContent, setHasContent] = useState(false);

  const colors = [
    "#22c55e",
    "#ffffff",
    "#ef4444",
    "#3b82f6",
    "#eab308",
    "#a855f7",
    "#f97316",
    "#06b6d4",
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (
    e: React.MouseEvent | React.TouchEvent
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "erase" ? "#0a0a0a" : brushColor;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setHasContent(true);
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const exportCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a copy with white background for better 3D model generation
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d")!;

    // White background
    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the sketch on top
    exportCtx.drawImage(canvas, 0, 0);

    const dataUrl = exportCanvas.toDataURL("image/png");
    onImageReady(dataUrl);
  }, [onImageReady]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;

        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        setHasContent(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface rounded-xl p-3 border border-border">
        {/* Tool selection */}
        <div className="flex gap-1">
          <button
            onClick={() => setTool("draw")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tool === "draw"
                ? "bg-accent text-black"
                : "bg-surface-light text-foreground hover:bg-border"
            }`}
          >
            ✏️ Draw
          </button>
          <button
            onClick={() => setTool("erase")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tool === "erase"
                ? "bg-accent text-black"
                : "bg-surface-light text-foreground hover:bg-border"
            }`}
          >
            🧹 Eraser
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border" />

        {/* Colors */}
        <div className="flex gap-1.5">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => {
                setBrushColor(c);
                setTool("draw");
              }}
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                brushColor === c && tool === "draw"
                  ? "border-white scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border" />

        {/* Brush size */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Size</span>
          <input
            type="range"
            min={1}
            max={30}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 accent-accent"
          />
          <span className="text-xs text-gray-400 w-5">{brushSize}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border" />

        {/* Actions */}
        <button
          onClick={clearCanvas}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-light text-foreground hover:bg-red-900/40 hover:text-red-400 transition-colors"
        >
          Clear
        </button>

        <label className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-light text-foreground hover:bg-border transition-colors cursor-pointer">
          📁 Upload
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-[#0a0a0a]">
        <canvas
          ref={canvasRef}
          className={`w-full h-[500px] ${
            tool === "erase" ? "canvas-erase" : "canvas-draw"
          }`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-600 text-lg">
              Draw something here or upload an image...
            </p>
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={exportCanvas}
        disabled={!hasContent}
        className="w-full py-3.5 rounded-xl text-lg font-bold bg-accent text-black hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
      >
        ✨ Generate 3D
      </button>
    </div>
  );
}
