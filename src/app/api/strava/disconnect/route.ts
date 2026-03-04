import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);

  db.prepare('DELETE FROM strava_activities WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM strava_sync_log WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM strava_tokens WHERE user_id = ?').run(userId);

  return NextResponse.json({ disconnected: true });
}
