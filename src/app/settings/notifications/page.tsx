import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NotificationSettings from '@/components/NotificationSettings';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <NotificationSettings
      currentUserId={Number(session.user.id)}
      currentUserName={session.user.name}
    />
  );
}
