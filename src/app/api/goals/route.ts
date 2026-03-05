import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

interface GoalRow {
  id: number;
  exercise_name: string;
  goal_type: string;
  scope: string;
  user_id: number | null;
  target_value: number;
  year: number;
  month: number | null;
}

function getGoalDateRange(goal: GoalRow): { start: string; end: string } {
  if (goal.goal_type === 'monthly' && goal.month) {
    const lastDay = new Date(goal.year, goal.month, 0).getDate();
    return {
      start: `${goal.year}-${String(goal.month).padStart(2, '0')}-01`,
      end: `${goal.year}-${String(goal.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }
  return { start: `${goal.year}-01-01`, end: `${goal.year}-12-31` };
}

function computeProgress(goal: GoalRow): number {
  const { start, end } = getGoalDateRange(goal);

  if (goal.scope === 'group') {
    const result = db.prepare(`
      SELECT COALESCE(SUM(
        CASE WHEN el.completed = 1
        THEN COALESCE(el.actual_value, e.target_value, 0)
        ELSE 0 END
      ), 0) as current_value
      FROM exercise_logs el
      JOIN exercises e ON e.id = el.exercise_id
      WHERE LOWER(TRIM(e.name)) = LOWER(TRIM(?))
        AND el.log_date >= ? AND el.log_date <= ?
    `).get(goal.exercise_name, start, end) as { current_value: number };
    return result.current_value;
  }

  // Individual
  const result = db.prepare(`
    SELECT COALESCE(SUM(
      CASE WHEN el.completed = 1
      THEN COALESCE(el.actual_value, e.target_value, 0)
      ELSE 0 END
    ), 0) as current_value
    FROM exercise_logs el
    JOIN exercises e ON e.id = el.exercise_id
    WHERE el.user_id = ?
      AND LOWER(TRIM(e.name)) = LOWER(TRIM(?))
      AND el.log_date >= ? AND el.log_date <= ?
  `).get(goal.user_id, goal.exercise_name, start, end) as { current_value: number };
  return result.current_value;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const goals = db.prepare(`
    SELECT g.*, u.name as user_name
    FROM goals g
    LEFT JOIN users u ON u.id = g.user_id
    ORDER BY g.year DESC, g.month DESC NULLS FIRST, g.exercise_name
  `).all() as Array<GoalRow & { user_name: string | null }>;

  const goalsWithProgress = goals.map(goal => {
    const currentValue = computeProgress(goal);
    const percent = goal.target_value > 0 ? Math.min(100, Math.round((currentValue / goal.target_value) * 100)) : 0;

    return {
      id: goal.id,
      exerciseName: goal.exercise_name,
      goalType: goal.goal_type,
      scope: goal.scope,
      userId: goal.user_id,
      userName: goal.user_name,
      targetValue: goal.target_value,
      currentValue,
      percentComplete: percent,
      year: goal.year,
      month: goal.month,
    };
  });

  return NextResponse.json({ goals: goalsWithProgress });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { exerciseName, goalType, scope, targetValue, year, month } = body;

  if (!exerciseName || !goalType || !scope || !targetValue || !year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['yearly', 'monthly'].includes(goalType)) {
    return NextResponse.json({ error: 'Invalid goal type' }, { status: 400 });
  }

  if (!['individual', 'group'].includes(scope)) {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }

  const userId = scope === 'individual' ? Number(session.user.id) : null;

  const result = db.prepare(`
    INSERT INTO goals (exercise_name, goal_type, scope, user_id, target_value, year, month)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(exerciseName, goalType, scope, userId, targetValue, year, month || null);

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
