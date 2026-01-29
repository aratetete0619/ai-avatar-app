// components/header.tsx
'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Zap } from 'lucide-react'; // アイコン追加

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null); // クレジット状態
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUserAndCredits = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        fetchCredits(user.id);
      }
    };
    getUserAndCredits();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCredits(session.user.id);
      }
    });

    // ★ 追加: クレジット更新イベントを受け取るリスナー
    const handleCreditUpdate = () => {
      if (user) {
        fetchCredits(user.id);
      } else {
        // userステートが古い可能性があるので再度取得して更新
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) fetchCredits(data.user.id);
        });
      }
    };

    // 'credit_updated' という名前のイベントを監視
    window.addEventListener('credit_updated', handleCreditUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('credit_updated', handleCreditUpdate);
    };
  }, [user]);

  // クレジット情報をDBから取得する関数
  const fetchCredits = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    
    if (data) {
      setCredits(data.credits);
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

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
            {/* クレジット表示エリア */}
            <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium text-sm">
              <Zap size={16} fill="currentColor" />
              <span>{credits !== null ? credits : '-'} Credits</span>
            </div>

            <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
            <Button onClick={handleLogout} variant="outline" size="sm">ログアウト</Button>
          </div>
        ) : (
          <Button onClick={handleLogin}>Googleでログイン</Button>
        )}
      </div>
    </header>
  );
}