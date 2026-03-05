import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { getVisibleUserIds, inPlaceholders } from '@/lib/connections';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = Number(session.user.id);
  const visibleIds = getVisibleUserIds(sessionUserId);

  const users = db
    .prepare(`SELECT id, name, avatar_url as avatarUrl FROM users WHERE id IN ${inPlaceholders(visibleIds)}`)
    .all(...visibleIds) as Array<{ id: number; name: string; avatarUrl: string | null }>;

  return NextResponse.json({ users });
}
