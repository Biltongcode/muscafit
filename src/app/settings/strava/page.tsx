import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import StravaSettings from '@/components/StravaSettings';

export default async function StravaSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  return (
    <StravaSettings
      currentUserId={Number(session.user.id)}
      currentUserName={session.user.name}
    />
  );
}
