import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image, customPrompt } = await request.json();

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

    // Build the prompt for 3D rendering
    const basePrompt =
      "Convert this sketch into a stunning photorealistic 3D render, high detail, professional studio lighting, octane render style";
    const prompt = customPrompt
      ? `${basePrompt}. ${customPrompt}`
      : basePrompt;

    console.log("Calling fal.ai with prompt:", prompt);

    // Use fal.ai FLUX.1 dev image-to-image for sketch-to-3D rendering
    const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        prompt,
        image_url: imageUrl,
        num_inference_steps: 40,
        guidance_scale: 3.5,
        strength: 0.85,
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log("Queue status:", update.status);
      },
    });

    console.log("fal.ai result:", JSON.stringify(result.data, null, 2));

    const output = result.data as Record<string, unknown>;
    const images = output?.images as Array<{ url: string }> | undefined;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No image was generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl: images[0].url,
    });
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
