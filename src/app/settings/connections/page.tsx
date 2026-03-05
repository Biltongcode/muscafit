import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ConnectionsManager from '@/components/ConnectionsManager';

export default async function ConnectionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <ConnectionsManager
      currentUserName={session.user.name}
    />
  );
}
