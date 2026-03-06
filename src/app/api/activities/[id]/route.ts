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
  const { durationMinutes, distanceKm, notes, status } = body;

  // If status is provided, update it too (e.g. marking planned → completed)
  if (status === 'completed' || status === 'planned') {
    db.prepare(
      `UPDATE activity_sessions SET
         duration_minutes = ?,
         distance_km = ?,
         notes = ?,
         status = ?
       WHERE id = ? AND user_id = ?`
    ).run(durationMinutes ?? null, distanceKm ?? null, notes ?? null, status, activityId, userId);
  } else {
    db.prepare(
      `UPDATE activity_sessions SET
         duration_minutes = ?,
         distance_km = ?,
         notes = ?
       WHERE id = ? AND user_id = ?`
    ).run(durationMinutes ?? null, distanceKm ?? null, notes ?? null, activityId, userId);
  }

  const activity = db
    .prepare(
      `SELECT id, user_id as userId, activity_type as activityType,
              duration_minutes as durationMinutes, distance_km as distanceKm,
              notes, session_date as sessionDate,
              COALESCE(status, 'completed') as status
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
