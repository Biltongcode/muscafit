import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStravaConnectedUserIds, syncUserActivities, getActivitiesForRange } from '@/lib/strava';
import { getVisibleUserIds } from '@/lib/connections';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(Number(searchParams.get('days') || 14), 30);

  const sessionUserId = Number(session.user.id);
  const visibleIds = getVisibleUserIds(sessionUserId);
  const stravaUserIds = getStravaConnectedUserIds();
  const connectedUserIds = stravaUserIds.filter(id => visibleIds.includes(id));

  // Trigger sync for each connected user
  await Promise.all(connectedUserIds.map((uid) => syncUserActivities(uid)));

  // Date range
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const activities = getActivitiesForRange(startDate, endDate);

  return NextResponse.json({ activities, connectedUserIds });
}
