import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import GoalManager from '@/components/GoalManager';

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <GoalManager
      currentUserId={Number(session.user.id)}
      currentUserName={session.user.name}
    />
  );
}
