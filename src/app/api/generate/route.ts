import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image, enhancedImageUrl } = await request.json();

    if (!image && !enhancedImageUrl) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: "FAL_KEY is not configured" },
        { status: 500 }
      );
    }

    let imageUrl: string;

    if (enhancedImageUrl) {
      // Use the pre-enhanced image URL directly (already in fal.ai storage)
      imageUrl = enhancedImageUrl;
      console.log("Using enhanced image URL:", imageUrl);
    } else {
      // Convert base64 data URL to a File and upload to fal.ai storage
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const blob = new Blob([buffer], { type: "image/png" });
      const file = new File([blob], "sketch.png", { type: "image/png" });

      console.log("Uploading image to fal.ai storage...");
      imageUrl = await fal.storage.upload(file);
      console.log("Uploaded image URL:", imageUrl);
    }

    // Try Trellis first for higher quality, fall back to TripoSR
    console.log("Generating 3D model...");
    let modelUrl: string | null = null;

    try {
      console.log("Trying Trellis...");
      const result = await fal.subscribe("fal-ai/trellis", {
        input: {
          image_url: imageUrl,
        },
        logs: true,
        onQueueUpdate: (update) => {
          console.log("Trellis queue:", update.status);
        },
      });

      console.log("Trellis result:", JSON.stringify(result.data, null, 2));
      const output = result.data as Record<string, unknown>;
      const modelMesh = output?.model_mesh as { url: string } | undefined;
      if (modelMesh?.url) {
        modelUrl = modelMesh.url;
      }
    } catch (trellisError) {
      console.error("Trellis failed, trying TripoSR...", trellisError);

      // Fallback to TripoSR
      const result = await fal.subscribe("fal-ai/triposr", {
        input: {
          image_url: imageUrl,
          output_format: "glb",
          do_remove_background: true,
          foreground_ratio: 0.9,
          mc_resolution: 256,
        },
        logs: true,
        onQueueUpdate: (update) => {
          console.log("TripoSR queue:", update.status);
        },
      });

      console.log("TripoSR result:", JSON.stringify(result.data, null, 2));
      const output = result.data as Record<string, unknown>;
      const modelMesh = output?.model_mesh as { url: string } | undefined;
      if (modelMesh?.url) {
        modelUrl = modelMesh.url;
      }
    }

    if (!modelUrl) {
      return NextResponse.json(
        { error: "No 3D model was generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ modelUrl });
  } catch (error: unknown) {
    console.error("Generation error:", JSON.stringify(error, null, 2));
    let message = "Generation failed";
    if (error instanceof Error) {
      message = error.message;
    }
    // fal.ai errors often have a body with details
    if (typeof error === "object" && error !== null) {
      const e = error as Record<string, unknown>;
      if (e.body) {
        console.error("Error body:", JSON.stringify(e.body, null, 2));
        const body = e.body as Record<string, unknown>;
        if (body.detail) message = String(body.detail);
      }
      if (e.status) {
        console.error("Error status:", e.status);
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
