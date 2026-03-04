import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activityId = Number(params.id);
  const userId = Number(session.user.id);

  const existing = db
    .prepare('SELECT id FROM activity_sessions WHERE id = ? AND user_id = ?')
    .get(activityId, userId);

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const { durationMinutes, distanceKm, notes } = body;

  db.prepare(
    `UPDATE activity_sessions SET
       duration_minutes = COALESCE(?, duration_minutes),
       distance_km = COALESCE(?, distance_km),
       notes = COALESCE(?, notes)
     WHERE id = ? AND user_id = ?`
  ).run(durationMinutes ?? null, distanceKm ?? null, notes ?? null, activityId, userId);

  const activity = db
    .prepare(
      `SELECT id, user_id as userId, activity_type as activityType,
              duration_minutes as durationMinutes, distance_km as distanceKm,
              notes, session_date as sessionDate
       FROM activity_sessions WHERE id = ?`
    )
    .get(activityId);

  return NextResponse.json({ activity });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activityId = Number(params.id);
  const userId = Number(session.user.id);

  const existing = db
    .prepare('SELECT id FROM activity_sessions WHERE id = ? AND user_id = ?')
    .get(activityId, userId);

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  db.prepare('DELETE FROM activity_sessions WHERE id = ? AND user_id = ?').run(activityId, userId);

  return NextResponse.json({ success: true });
}
