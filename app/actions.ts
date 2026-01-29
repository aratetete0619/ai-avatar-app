// app/actions.ts
'use server';

import Replicate from "replicate";
import { createClient } from "@/utils/supabase/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateImage(prompt: string) {
  try {
    // 1. Supabaseクライアントの初期化
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // ログインチェック
    if (!user) {
      return { success: false, error: "ログインが必要です" };
    }

    // 2. クレジット残高を確認
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "ユーザー情報の取得に失敗しました" };
    }

    if (profile.credits < 1) {
      return { 
        success: false, 
        error: "クレジットが不足しています。" 
      };
    }

    console.log(`Generating... Credits remaining: ${profile.credits}`);
    
    // 3. Replicateで画像を生成
    // モデルを google/imagen-4 に指定し、パラメータを整理
    let output;
        try {
        output = await replicate.run(
            "google/imagen-4",
            {
            input: {
                prompt: prompt,
                aspect_ratio: "1:1",
                output_format: "png",
            },
            }
        );
        } catch (replicateError: any) {
        console.error("Replicate Error:", replicateError);
        
        // ★ ここで「Sensitive」エラーをキャッチする
        if (replicateError.message?.includes("sensitive") || replicateError.toString().includes("sensitive")) {
            return { 
            success: false, 
            error: "コンテンツポリシーに抵触する可能性があるため生成できませんでした。別のプロンプトを試してください。" 
            };
        }
        
        throw replicateError; // その他のエラーは下のcatchに投げる
    }

    // 4. ストリームデータをバッファに変換
    let imageBuffer: ArrayBuffer | null = null;

    if (output instanceof ReadableStream) {
      imageBuffer = await new Response(output).arrayBuffer();
    } else if (Array.isArray(output) && output[0] instanceof ReadableStream) {
      imageBuffer = await new Response(output[0]).arrayBuffer();
    } else if (Array.isArray(output) && typeof output[0] === 'string') {
        const response = await fetch(output[0]);
        imageBuffer = await response.arrayBuffer();
    }

    if (!imageBuffer) {
      throw new Error("画像データの取得に失敗しました");
    }

    // 5. Supabaseへの保存とクレジット消費
    let finalImageUrl = "";

    try {
      // 拡張子を .png に変更
      const fileName = `${user.id}/${Date.now()}.png`;
      
      // A. Storageにアップロード (Content-Typeも image/png に変更)
      const { error: uploadError } = await supabase.storage
        .from('generated_images')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // B. 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('generated_images')
        .getPublicUrl(fileName);
      
      finalImageUrl = publicUrl;

      // C. DBに生成記録を追加
      await supabase.from('generations').insert({
        user_id: user.id,
        prompt: prompt,
        image_url: finalImageUrl,
      });

      // D. クレジットを消費（RPC関数を使用）
      const { error: rpcError } = await supabase.rpc('decrement_credits', { 
        p_user_id: user.id, 
        amount: 1 
      });

      if (rpcError) {
        console.error("クレジット消費エラー:", rpcError);
      } else {
        console.log("Credit decremented successfully.");
      }

    } catch (saveError) {
      console.error("保存失敗:", saveError);
    }

    // 保存できなかった場合のフォールバック（Base64もPNGに変更）
    if (!finalImageUrl) {
      const base64 = Buffer.from(imageBuffer).toString('base64');
      finalImageUrl = `data:image/png;base64,${base64}`;
    }

    return { success: true, imageUrl: finalImageUrl };
    
  } catch (error) {
    console.error("Image generation failed:", error);
    return { success: false, error: "画像の生成に失敗しました" };
  }
}