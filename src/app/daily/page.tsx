import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DailyView from '@/components/DailyView';
import db from '@/lib/db';

export default async function DailyPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(Number(session.user.id)) as { avatar_url: string | null } | undefined;

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center text-gray-400 dark:text-slate-500">Loading...</div>}>
      <DailyView
        currentUserId={Number(session.user.id)}
        currentUserName={session.user.name}
        currentUserAvatar={user?.avatar_url}
      />
    </Suspense>
  );
}
