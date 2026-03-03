import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DailyView from '@/components/DailyView';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <DailyView
      currentUserId={Number(session.user.id)}
      currentUserName={session.user.name}
    />
  );
}
