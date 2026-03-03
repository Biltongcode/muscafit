import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
  }

  // Get all users
  const allUsers = db.prepare('SELECT id, name FROM users').all() as Array<{ id: number; name: string }>;

  // For each user, auto-generate log entries for active exercises that don't have one
  const insertLog = db.prepare(
    `INSERT OR IGNORE INTO exercise_logs (user_id, exercise_id, log_date)
     VALUES (?, ?, ?)`
  );

  const getActiveExercises = db.prepare(
    'SELECT id FROM exercises WHERE user_id = ? AND is_active = 1'
  );

  for (const user of allUsers) {
    const exercises = getActiveExercises.all(user.id) as Array<{ id: number }>;
    for (const ex of exercises) {
      insertLog.run(user.id, ex.id, date);
    }
  }

  // Fetch all logs with exercise details for the date
  const getLogs = db.prepare(
    `SELECT
       el.id as log_id,
       el.user_id,
       el.exercise_id,
       e.name,
       e.target_type,
       e.target_value,
       e.target_sets,
       e.target_per_set,
       e.notes as exercise_notes,
       e.sort_order,
       el.completed,
       el.actual_value,
       el.actual_sets,
       el.notes as log_notes,
       el.completed_at
     FROM exercise_logs el
     JOIN exercises e ON e.id = el.exercise_id
     WHERE el.log_date = ? AND e.is_active = 1
     ORDER BY e.sort_order`
  );

  const allLogs = getLogs.all(date) as Array<{
    log_id: number;
    user_id: number;
    exercise_id: number;
    name: string;
    target_type: string;
    target_value: number | null;
    target_sets: number | null;
    target_per_set: number | null;
    exercise_notes: string | null;
    sort_order: number;
    completed: number;
    actual_value: number | null;
    actual_sets: number | null;
    log_notes: string | null;
    completed_at: string | null;
  }>;

  // Group by user
  const users = allUsers.map((user) => ({
    id: user.id,
    name: user.name,
    exercises: allLogs
      .filter((log) => log.user_id === user.id)
      .map((log) => ({
        logId: log.log_id,
        exerciseId: log.exercise_id,
        name: log.name,
        targetType: log.target_type,
        targetValue: log.target_value,
        targetSets: log.target_sets,
        targetPerSet: log.target_per_set,
        exerciseNotes: log.exercise_notes,
        completed: log.completed === 1,
        actualValue: log.actual_value,
        actualSets: log.actual_sets,
        logNotes: log.log_notes,
        completedAt: log.completed_at,
      })),
  }));

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { exerciseId, date, completed, actualValue, actualSets, notes } = body;

  if (!exerciseId || !date) {
    return NextResponse.json({ error: 'exerciseId and date required' }, { status: 400 });
  }

  const userId = Number(session.user.id);

  // Verify the exercise belongs to this user
  const exercise = db
    .prepare('SELECT id FROM exercises WHERE id = ? AND user_id = ?')
    .get(exerciseId, userId);

  if (!exercise) {
    return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  }

  const completedAt = completed ? new Date().toISOString() : null;

  // Upsert
  db.prepare(
    `INSERT INTO exercise_logs (user_id, exercise_id, log_date, completed, actual_value, actual_sets, notes, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, exercise_id, log_date)
     DO UPDATE SET
       completed = excluded.completed,
       actual_value = COALESCE(excluded.actual_value, actual_value),
       actual_sets = COALESCE(excluded.actual_sets, actual_sets),
       notes = COALESCE(excluded.notes, notes),
       completed_at = excluded.completed_at`
  ).run(userId, exerciseId, date, completed ? 1 : 0, actualValue ?? null, actualSets ?? null, notes ?? null, completedAt);

  // Return the updated log
  const log = db
    .prepare('SELECT id, completed, actual_value, actual_sets, notes, completed_at FROM exercise_logs WHERE user_id = ? AND exercise_id = ? AND log_date = ?')
    .get(userId, exerciseId, date);

  return NextResponse.json({ log });
}
