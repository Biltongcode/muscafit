import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { getVisibleUserIds, inPlaceholders } from '@/lib/connections';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
  }

  const sessionUserId = Number(session.user.id);
  const visibleIds = getVisibleUserIds(sessionUserId);

  const activities = db
    .prepare(
      `SELECT a.id, a.user_id as userId, a.activity_type as activityType,
              a.duration_minutes as durationMinutes, a.distance_km as distanceKm,
              a.notes, a.session_date as sessionDate
       FROM activity_sessions a
       WHERE a.session_date = ?
         AND a.user_id IN ${inPlaceholders(visibleIds)}
       ORDER BY a.created_at`
    )
    .all(date, ...visibleIds);

  return NextResponse.json({ activities });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { date, activityType, durationMinutes, distanceKm, notes } = body;

  if (!date || !activityType) {
    return NextResponse.json({ error: 'date and activityType required' }, { status: 400 });
  }

  const userId = Number(session.user.id);

  const result = db
    .prepare(
      `INSERT INTO activity_sessions (user_id, session_date, activity_type, duration_minutes, distance_km, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(userId, date, activityType, durationMinutes ?? null, distanceKm ?? null, notes ?? null);

  const activity = db
    .prepare(
      `SELECT id, user_id as userId, activity_type as activityType,
              duration_minutes as durationMinutes, distance_km as distanceKm,
              notes, session_date as sessionDate
       FROM activity_sessions WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  return NextResponse.json({ activity }, { status: 201 });
}
