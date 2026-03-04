import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import WeeklyView from '@/components/WeeklyView';

export default async function WeeklyPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <WeeklyView
      currentUserId={Number(session.user.id)}
      currentUserName={session.user.name}
    />
  );
}
