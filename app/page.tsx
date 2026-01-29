// app/page.tsx
'use client';

import { useState } from 'react';
import { generateImage } from './actions'; // さっき作ったServer Action
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner'; // 新しい通知ライブラリ

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setIsLoading(true);
    const result = await generateImage(prompt);
    setIsLoading(false);

    if (result.success && result.imageUrl) {
      setImageUrl(result.imageUrl);
      toast.success("画像生成が完了しました！");
    } else {
      toast.error(result.error || "エラーが発生しました");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-8 bg-zinc-50 text-zinc-900">
      <h1 className="text-3xl font-bold tracking-tighter">AI Avatar Generator</h1>

      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="どんな画像を作りますか？ (例: a cute cyberpunk cat)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "生成中..." : "生成"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {imageUrl && (
        <div className="relative rounded-lg overflow-hidden border shadow-lg max-w-md">
           {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Generated AI" className="w-full h-auto" />
        </div>
      )}
    </div>
  );
}