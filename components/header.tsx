// components/header.tsx
'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 起動時に今のユーザー情報を取得
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // ログイン状態の変化を監視（リアルタイム更新）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ログイン処理
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('ログアウトしました');
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between p-4 border-b bg-white">
      <h1 className="text-xl font-bold">AI Avatar App</h1>
      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <Button onClick={handleLogout} variant="outline">ログアウト</Button>
          </div>
        ) : (
          <Button onClick={handleLogin}>Googleでログイン</Button>
        )}
      </div>
    </header>
  );
}