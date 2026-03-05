import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logId = Number(params.id);
  const userId = Number(session.user.id);

  // Verify ownership
  const log = db
    .prepare('SELECT id, completed FROM exercise_logs WHERE id = ? AND user_id = ?')
    .get(logId, userId) as { id: number; completed: number } | undefined;

  if (!log) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const { completed, actualValue, actualSets, actualWeight, notes } = body;

  const completedAt = completed !== undefined
    ? (completed ? new Date().toISOString() : null)
    : undefined;

  db.prepare(
    `UPDATE exercise_logs SET
       completed = COALESCE(?, completed),
       actual_value = COALESCE(?, actual_value),
       actual_sets = COALESCE(?, actual_sets),
       actual_weight = COALESCE(?, actual_weight),
       notes = COALESCE(?, notes),
       completed_at = CASE WHEN ? IS NOT NULL THEN ? ELSE completed_at END
     WHERE id = ? AND user_id = ?`
  ).run(
    completed !== undefined ? (completed ? 1 : 0) : null,
    actualValue ?? null,
    actualSets ?? null,
    actualWeight ?? null,
    notes ?? null,
    completedAt !== undefined ? 'set' : null,
    completedAt ?? null,
    logId,
    userId
  );

  const updated = db
    .prepare('SELECT id, completed, actual_value, actual_sets, actual_weight, notes, completed_at FROM exercise_logs WHERE id = ?')
    .get(logId);

  return NextResponse.json({ log: updated });
}
