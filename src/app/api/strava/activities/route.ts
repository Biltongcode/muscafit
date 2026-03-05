import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStravaConnectedUserIds, syncUserActivities, getActivitiesForDate } from '@/lib/strava';
import { getVisibleUserIds } from '@/lib/connections';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
  }

  const sessionUserId = Number(session.user.id);
  const visibleIds = getVisibleUserIds(sessionUserId);
  const stravaUserIds = getStravaConnectedUserIds();
  const connectedUserIds = stravaUserIds.filter(id => visibleIds.includes(id));

  // Trigger sync for each connected user (respects cooldown internally)
  await Promise.all(connectedUserIds.map((uid) => syncUserActivities(uid)));

  // Get cached activities for all connected users
  const activities = connectedUserIds.flatMap((uid) => getActivitiesForDate(uid, date));

  return NextResponse.json({ activities, connectedUserIds });
}
