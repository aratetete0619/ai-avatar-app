// app/actions.ts
'use server';

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateImage(prompt: string) {
  try {
    // 最新の高速モデル "Flux Schnell" を使用
    const output = await replicate.run(
      "google/imagen-4",
      {
        input: {
          prompt: prompt,
          go_fast: true, // 高速化オプション
          megapixels: "1", // 解像度
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 80,
        },
      }
    );

    // outputは通常、画像URLの配列で返ってきます
    return { success: true, imageUrl: (output as string[])[0] };
  } catch (error) {
    console.error("Image generation failed:", error);
    return { success: false, error: "画像の生成に失敗しました" };
  }
}