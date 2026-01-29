// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { generateImage } from './actions';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react'; // アイコン用

// データベースの型定義（簡易版）
type Generation = {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<Generation[]>([]);
  const supabase = createClient();

  // 1. ページ読み込み時に、過去の画像をロードする
  useEffect(() => {
    const fetchImages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false }); // 新しい順

      if (error) {
        console.error('Error fetching images:', error);
      } else if (data) {
        setImages(data);
      }
    };

    fetchImages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setIsLoading(true);
    
    // Server Actionを呼び出し
    const result = await generateImage(prompt);
    
    setIsLoading(false);

    if (result.success && result.imageUrl) {
      toast.success("画像生成が完了しました！");
      setPrompt('');
      
      // ★ 追加: ヘッダーに「クレジット減らして表示して！」と伝える
      window.dispatchEvent(new Event('credit_updated'));

      // ギャラリーへの追加処理
      const newImage: Generation = {
        id: Math.random().toString(),
        image_url: result.imageUrl,
        prompt: prompt,
        created_at: new Date().toISOString(),
      };
      setImages([newImage, ...images]);

    } else {
      // エラーメッセージを表示（「不適切なコンテンツ〜」もここで表示される）
      toast.error(result.error || "エラーが発生しました");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-8 gap-12 bg-zinc-50 text-zinc-900">
      
      {/* ヘッダーエリア */}
      <div className="flex flex-col items-center space-y-2 text-center">
        <h1 className="text-4xl font-extrabold tracking-tighter">AI Avatar Generator</h1>
        <p className="text-zinc-500">あなただけのユニークなアバターを一瞬で作成します</p>
      </div>

      {/* 生成フォーム */}
      <Card className="w-full max-w-xl shadow-lg">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              placeholder="例: a cyberpunk cat, neon lights, 8k"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading} className="min-w-[100px]">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "生成"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ギャラリーエリア */}
      <div className="w-full max-w-6xl space-y-6">
        <h2 className="text-2xl font-bold border-b pb-2">My Gallery</h2>
        
        {images.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p>まだ画像がありません。上のフォームから生成してみましょう！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((img) => (
              <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-all">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={img.image_url} 
                  alt={img.prompt} 
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {/* ホバー時にプロンプトを表示 */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-sm line-clamp-2">{img.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}