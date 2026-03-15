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
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"enhancing" | "generating" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipEnhance, setSkipEnhance] = useState(false);

  const handleGenerate = async (dataUrl: string) => {
    setSourceImage(dataUrl);
    setEnhancedImage(null);
    setModelUrl(null);
    setError(null);
    setLoading(true);

    try {
      let enhancedImageUrl: string | undefined;

      if (!skipEnhance) {
        // Step 1: Enhance the sketch with AI for better depth
        setPhase("enhancing");
        const enhanceRes = await fetch("/api/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });

        const enhanceData = await enhanceRes.json();

        if (!enhanceRes.ok) {
          console.warn("Enhancement failed, proceeding with raw sketch:", enhanceData.error);
          setError("Enhancement failed — 3D quality may be reduced. Generating anyway...");
          // Clear the error after a moment so it doesn't block the flow
          setTimeout(() => setError(null), 3000);
        } else {
          enhancedImageUrl = enhanceData.enhancedImageUrl;
          setEnhancedImage(enhancedImageUrl ?? null);
        }
      }

      // Step 2: Generate 3D model
      setPhase("generating");
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, enhancedImageUrl }),
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
      setPhase(null);
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-400">
                Your Sketch
              </h2>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipEnhance}
                  onChange={(e) => setSkipEnhance(e.target.checked)}
                  className="accent-accent w-3.5 h-3.5"
                />
                Skip AI enhancement
              </label>
            </div>
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
                      {phase === "enhancing"
                        ? "Enhancing sketch for depth..."
                        : "Generating 3D model..."}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {phase === "enhancing"
                        ? "Adding shading and depth cues (15-20s)"
                        : "Converting to 3D geometry (30-60s)"}
                    </p>
                  </div>
                  <div className="mt-4 flex gap-3 items-end">
                    {sourceImage && (
                      <div className="opacity-30">
                        <p className="text-[10px] text-gray-600 mb-1 text-center">Sketch</p>
                        <img
                          src={sourceImage}
                          alt="Source sketch"
                          className="w-24 h-24 object-contain rounded-lg"
                        />
                      </div>
                    )}
                    {enhancedImage && (
                      <div className="opacity-80">
                        <p className="text-[10px] text-accent mb-1 text-center">Enhanced</p>
                        <img
                          src={enhancedImage}
                          alt="Enhanced sketch"
                          className="w-24 h-24 object-contain rounded-lg border border-accent/30"
                        />
                      </div>
                    )}
                  </div>
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
                        setEnhancedImage(null);
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
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">
                      Original Sketch
                    </p>
                    <img
                      src={sourceImage}
                      alt="Original sketch"
                      className="w-32 rounded-lg border border-border"
                    />
                  </div>
                  {enhancedImage && (
                    <div>
                      <p className="text-xs text-accent mb-2 font-medium">
                        AI Enhanced
                      </p>
                      <img
                        src={enhancedImage}
                        alt="Enhanced sketch"
                        className="w-32 rounded-lg border border-accent/30"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
