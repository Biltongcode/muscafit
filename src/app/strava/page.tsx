import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import StravaFeed from '@/components/StravaFeed';
import db from '@/lib/db';

export default async function StravaPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  // Get all users for avatar display in the feed
  const users = db.prepare('SELECT id, name, avatar_url FROM users').all() as Array<{
    id: number;
    name: string;
    avatar_url: string | null;
  }>;

  return (
    <StravaFeed
      currentUserName={session.user.name}
      users={users.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatar_url }))}
    />
  );
}
