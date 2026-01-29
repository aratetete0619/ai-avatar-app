// app/actions.ts
'use server';

import Replicate from "replicate";
import { createClient } from "@/utils/supabase/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateImage(prompt: string) {
  try {
    console.log("1. Generating image for prompt:", prompt);
    
    // Replicateで画像を生成
    const output = await replicate.run(
      "google/imagen-4",
      {
        input: {
          prompt: prompt,
          go_fast: true,
          megapixels: "1",
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 80,
        },
      }
    );

    // ■ 変更点: ストリーム（生データ）をバッファ（ファイルデータ）に変換する
    let imageBuffer: ArrayBuffer | null = null;

    if (output instanceof ReadableStream) {
      // 単体のストリームが返ってきた場合
      imageBuffer = await new Response(output).arrayBuffer();
    } else if (Array.isArray(output) && output[0] instanceof ReadableStream) {
      // ストリームの配列が返ってきた場合
      imageBuffer = await new Response(output[0]).arrayBuffer();
    } else if (Array.isArray(output) && typeof output[0] === 'string') {
        // もしURLで返ってきた場合（念のため）
        const response = await fetch(output[0]);
        imageBuffer = await response.arrayBuffer();
    }

    if (!imageBuffer) {
      throw new Error("画像データの取得に失敗しました");
    }

    // 2. ユーザーがログインしているかチェック
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let finalImageUrl = "";

    // ログインしている場合: Supabaseに保存
    if (user) {
      try {
        console.log("Saving to Supabase...");
        const fileName = `${user.id}/${Date.now()}.webp`;
        
        // バッファを直接アップロード
        const { error: uploadError } = await supabase.storage
          .from('generated_images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/webp',
          });

        if (uploadError) throw uploadError;

        // 公開URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('generated_images')
          .getPublicUrl(fileName);
        
        finalImageUrl = publicUrl;

        // DBに記録
        await supabase.from('generations').insert({
          user_id: user.id,
          prompt: prompt,
          image_url: finalImageUrl,
        });
        
        console.log("Saved successfully!");

      } catch (saveError) {
        console.error("保存失敗:", saveError);
        // 保存失敗時はBase64で返す（下で処理）
      }
    }

    // 保存しなかった（または失敗した）場合: Base64データとしてブラウザに返す
    if (!finalImageUrl) {
        const base64 = Buffer.from(imageBuffer).toString('base64');
        finalImageUrl = `data:image/webp;base64,${base64}`;
    }

    return { success: true, imageUrl: finalImageUrl };
    
  } catch (error) {
    console.error("Image generation failed:", error);
    return { success: false, error: "画像の生成に失敗しました" };
  }
}