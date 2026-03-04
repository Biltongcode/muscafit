import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProfileSettings from '@/components/ProfileSettings';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <ProfileSettings
      currentUserId={Number(session.user.id)}
      currentUserName={session.user.name}
    />
  );
}
