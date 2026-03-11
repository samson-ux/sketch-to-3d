import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: "FAL_KEY is not configured" },
        { status: 500 }
      );
    }

    // Convert base64 data URL to a File and upload to fal.ai storage
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: "image/png" });
    const file = new File([blob], "sketch.png", { type: "image/png" });

    console.log("Uploading image to fal.ai storage...");
    const imageUrl = await fal.storage.upload(file);
    console.log("Uploaded image URL:", imageUrl);

    // Use Trellis for actual 3D model generation (outputs GLB mesh)
    console.log("Generating 3D model with Trellis...");
    const result = await fal.subscribe("fal-ai/trellis", {
      input: {
        image_url: imageUrl,
        ss_guidance_strength: 7.5,
        ss_sampling_steps: 12,
        slat_guidance_strength: 3,
        slat_sampling_steps: 12,
        mesh_simplify: 0.95,
        texture_size: "1024",
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log("Queue status:", update.status);
      },
    });

    console.log("Trellis result:", JSON.stringify(result.data, null, 2));

    const output = result.data as Record<string, unknown>;
    const modelMesh = output?.model_mesh as { url: string } | undefined;

    if (!modelMesh?.url) {
      return NextResponse.json(
        { error: "No 3D model was generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      modelUrl: modelMesh.url,
    });
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
