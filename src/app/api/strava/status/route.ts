import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);

  const token = db.prepare('SELECT strava_athlete_id FROM strava_tokens WHERE user_id = ?').get(userId) as { strava_athlete_id: number } | undefined;
  const sync = db.prepare('SELECT synced_at, activities_fetched FROM strava_sync_log WHERE user_id = ?').get(userId) as { synced_at: string; activities_fetched: number } | undefined;

  return NextResponse.json({
    connected: !!token,
    athleteId: token?.strava_athlete_id ?? null,
    lastSync: sync?.synced_at ?? null,
    activitiesCached: sync?.activities_fetched ?? 0,
  });
}
