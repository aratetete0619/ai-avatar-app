// app/auth/callback/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Googleから返ってきたURLにある「認証コード」を取得
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    // 認証コードをセッション（クッキー）に交換する
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 処理が終わったらトップページへリダイレクト
  return NextResponse.redirect(requestUrl.origin);
}