import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const exerciseId = Number(params.id);
  const userId = Number(session.user.id);

  // Verify ownership
  const exercise = db
    .prepare('SELECT id FROM exercises WHERE id = ? AND user_id = ?')
    .get(exerciseId, userId);

  if (!exercise) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();

  // Build dynamic update — only update fields that are present in the body
  const fields: string[] = [];
  const values: unknown[] = [];

  const fieldMap: Record<string, string> = {
    name: 'name',
    targetType: 'target_type',
    targetValue: 'target_value',
    targetSets: 'target_sets',
    targetPerSet: 'target_per_set',
    notes: 'notes',
    sortOrder: 'sort_order',
    isActive: 'is_active',
    scheduleDays: 'schedule_days',
  };

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in body) {
      fields.push(`${dbCol} = ?`);
      values.push(body[jsKey] ?? null);
    }
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(exerciseId, userId);

  db.prepare(
    `UPDATE exercises SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
  ).run(...values);

  const updated = db
    .prepare(
      `SELECT id, name, target_type as targetType, target_value as targetValue,
              target_sets as targetSets, target_per_set as targetPerSet,
              notes, sort_order as sortOrder, is_active as isActive, schedule_days as scheduleDays
       FROM exercises WHERE id = ?`
    )
    .get(exerciseId);

  return NextResponse.json({ exercise: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const exerciseId = Number(params.id);
  const userId = Number(session.user.id);

  // Verify ownership
  const exercise = db
    .prepare('SELECT id FROM exercises WHERE id = ? AND user_id = ?')
    .get(exerciseId, userId);

  if (!exercise) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Delete associated logs first, then the exercise
  db.prepare('DELETE FROM exercise_logs WHERE exercise_id = ? AND user_id = ?').run(exerciseId, userId);
  db.prepare('DELETE FROM exercises WHERE id = ? AND user_id = ?').run(exerciseId, userId);

  return NextResponse.json({ success: true });
}
