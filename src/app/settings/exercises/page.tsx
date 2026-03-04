import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ExerciseManager from '@/components/ExerciseManager';

export default async function ExercisesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <ExerciseManager
      currentUserId={Number(session.user.id)}
      currentUserName={session.user.name}
    />
  );
}
