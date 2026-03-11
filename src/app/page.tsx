"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import DrawingCanvas from "@/components/DrawingCanvas";

// Dynamically import the 3D viewer to avoid SSR issues with Three.js
const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-[#0a0a0a] rounded-xl">
      <p className="text-gray-500">Loading 3D viewer...</p>
    </div>
  ),
});

export default function Home() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (dataUrl: string) => {
    setSourceImage(dataUrl);
    setModelUrl(null);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setModelUrl(data.modelUrl);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!modelUrl) return;
    try {
      const response = await fetch(modelUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sketch-to-3d-${Date.now()}.glb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(modelUrl, "_blank");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-xl">
              🎨
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Sketch to 3D
              </h1>
              <p className="text-xs text-gray-500">
                AI-Powered 3D Model Generation
              </p>
            </div>
          </div>
          <a
            href="https://fal.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-accent transition-colors"
          >
            Powered by fal.ai
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main content: Canvas + Result */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Drawing Canvas */}
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-3">
              Your Sketch
            </h2>
            <DrawingCanvas onImageReady={handleGenerate} />
          </div>

          {/* Right: 3D Result */}
          <div>
            <h2 className="text-sm font-medium text-gray-400 mb-3">
              3D Model
            </h2>
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              {loading && (
                <div className="min-h-[500px] flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-border rounded-full" />
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-accent rounded-full animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-accent font-medium animate-pulse-green">
                      Generating 3D model...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      This may take 30-60 seconds
                    </p>
                  </div>
                  {sourceImage && (
                    <div className="mt-4 opacity-30">
                      <img
                        src={sourceImage}
                        alt="Source sketch"
                        className="w-32 h-32 object-contain rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {!loading && error && (
                <div className="min-h-[500px] flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center text-2xl">
                    ⚠️
                  </div>
                  <p className="text-red-400 font-medium">Generation Failed</p>
                  <p className="text-sm text-gray-500 max-w-sm">{error}</p>
                </div>
              )}

              {!loading && !error && modelUrl && (
                <div className="flex flex-col">
                  <ModelViewer modelUrl={modelUrl} />
                  <div className="p-4 flex gap-3 border-t border-border">
                    <button
                      onClick={handleDownload}
                      className="flex-1 py-2.5 rounded-lg font-medium bg-accent text-black hover:bg-accent-hover transition-colors active:scale-[0.98]"
                    >
                      ⬇ Download 3D Model (.glb)
                    </button>
                    <button
                      onClick={() => {
                        setModelUrl(null);
                        setSourceImage(null);
                      }}
                      className="px-4 py-2.5 rounded-lg font-medium bg-surface-light text-foreground hover:bg-border transition-colors"
                    >
                      New
                    </button>
                  </div>
                </div>
              )}

              {!loading && !error && !modelUrl && (
                <div className="min-h-[500px] flex flex-col items-center justify-center gap-3 text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center text-3xl">
                    🧊
                  </div>
                  <p className="text-gray-500">
                    Your 3D model will appear here
                  </p>
                  <p className="text-xs text-gray-600">
                    Draw a sketch and click &quot;Generate 3D&quot; to create an
                    interactive 3D model you can spin and explore
                  </p>
                </div>
              )}
            </div>

            {/* Source image reference */}
            {!loading && modelUrl && sourceImage && (
              <div className="mt-4 p-4 rounded-xl bg-surface border border-border">
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  Original Sketch
                </p>
                <img
                  src={sourceImage}
                  alt="Original sketch"
                  className="w-32 rounded-lg border border-border"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
