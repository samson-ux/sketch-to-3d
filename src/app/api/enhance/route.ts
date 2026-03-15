import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image, prompt, strength } = await request.json();

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

    console.log("Uploading sketch to fal.ai storage for enhancement...");
    const imageUrl = await fal.storage.upload(file);
    console.log("Uploaded image URL:", imageUrl);

    // Use Flux Dev image-to-image to enhance the sketch with depth cues
    const enhancePrompt =
      prompt ||
      "same object, add realistic shading, shadows, highlights, and surface texture, preserve exact shape and proportions, 3D render, studio lighting, white background";

    console.log("Enhancing sketch with Flux Dev img2img...");
    const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: imageUrl,
        prompt: enhancePrompt,
        strength: strength ?? 0.55,
        num_inference_steps: 35,
        guidance_scale: 7.5,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log("Enhance queue:", update.status);
      },
    });

    console.log("Enhancement result:", JSON.stringify(result.data, null, 2));
    const output = result.data as Record<string, unknown>;
    const images = output?.images as { url: string }[] | undefined;

    if (!images?.[0]?.url) {
      return NextResponse.json(
        { error: "Enhancement failed - no image returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({ enhancedImageUrl: images[0].url });
  } catch (error: unknown) {
    console.error("Enhancement error:", JSON.stringify(error, null, 2));
    let message = "Enhancement failed";
    if (error instanceof Error) {
      message = error.message;
    }
    if (typeof error === "object" && error !== null) {
      const e = error as Record<string, unknown>;
      if (e.body) {
        console.error("Error body:", JSON.stringify(e.body, null, 2));
        const body = e.body as Record<string, unknown>;
        if (body.detail) message = String(body.detail);
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
