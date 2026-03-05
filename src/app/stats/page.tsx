import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import StatsView from '@/components/StatsView';

export default async function StatsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <StatsView
      currentUserId={Number(session.user.id)}
      currentUserName={session.user.name}
    />
  );
}
