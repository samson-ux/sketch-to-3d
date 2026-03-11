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

    // Build the prompt for 3D rendering
    const basePrompt =
      "Convert this sketch into a stunning photorealistic 3D render, high detail, professional studio lighting, octane render style";
    const prompt = customPrompt
      ? `${basePrompt}. ${customPrompt}`
      : basePrompt;

    // Use fal.ai's image-to-image with SDXL for best 3D rendering from sketches
    const result = await fal.subscribe("fal-ai/stable-diffusion-3-medium", {
      input: {
        prompt,
        image_url: image,
        image_size: "square_hd",
        num_inference_steps: 28,
        guidance_scale: 7.5,
        strength: 0.75,
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: true,
    });

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
