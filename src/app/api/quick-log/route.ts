import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    name, targetType, date,
    actualValue, actualSets, actualWeight, weightUnit,
    actualDistance, distanceUnit, notes,
  } = body;

  if (!name || !targetType || !date) {
    return NextResponse.json({ error: 'name, targetType, and date are required' }, { status: 400 });
  }

  const userId = Number(session.user.id);

  // Create the exercise as inactive (won't appear in their regular plan)
  // but with is_active = 1 so the log query picks it up for display
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM exercises WHERE user_id = ?')
    .get(userId) as { max_order: number };

  // Set target values to match what they actually did
  const targetValue = (targetType === 'reps' || targetType === 'reps_sets' || targetType === 'timed' || targetType === 'timed_sets')
    ? actualValue : null;
  const targetSets = actualSets || null;
  const targetPerSet = null;
  const targetWeight = actualWeight || null;
  const targetDistance = actualDistance || null;

  const exResult = db
    .prepare(
      `INSERT INTO exercises (user_id, name, target_type, target_value, target_sets, target_per_set, notes, sort_order, schedule_days, target_weight, weight_unit, target_distance, distance_unit, is_active, canonical_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    )
    .run(
      userId, name, targetType,
      targetValue, targetSets, targetPerSet,
      null, maxOrder.max_order + 1,
      'none', // 'none' = never auto-generate logs (quick log only)
      targetWeight, weightUnit || 'kg',
      targetDistance, distanceUnit || 'm',
      name // canonical_name
    );

  const exerciseId = exResult.lastInsertRowid;

  // Create the log entry, already completed
  const completedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO exercise_logs (user_id, exercise_id, log_date, completed, actual_value, actual_sets, actual_weight, actual_distance, notes, completed_at)
     VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId, exerciseId, date,
    actualValue ?? null, actualSets ?? null,
    actualWeight ?? null, actualDistance ?? null,
    notes ?? null, completedAt
  );

  return NextResponse.json({ success: true, exerciseId }, { status: 201 });
}
