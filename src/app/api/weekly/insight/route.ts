import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { generateWeeklyInsight, WeeklyExerciseStat, WeeklyActivityStat } from '@/lib/ai';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end params required' }, { status: 400 });
  }

  // Check cache first
  const cached = db.prepare(
    'SELECT insight FROM weekly_insights WHERE user_id = ? AND week_start = ?'
  ).get(userId, start) as { insight: string } | undefined;

  if (cached) {
    return NextResponse.json({ insight: cached.insight });
  }

  // Query exercise stats for this user's week
  const exercises = db.prepare(`
    SELECT e.name,
      COUNT(CASE WHEN el.completed = 1 THEN 1 END) as days_done,
      COUNT(*) as days_total,
      SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) ELSE 0 END) as total_value,
      e.target_type,
      e.target_weight,
      e.weight_unit,
      SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) * COALESCE(el.actual_weight, e.target_weight, 0) ELSE 0 END) as total_volume
    FROM exercise_logs el
    JOIN exercises e ON e.id = el.exercise_id
    WHERE el.user_id = ? AND el.log_date >= ? AND el.log_date <= ?
    GROUP BY e.name
    ORDER BY e.name
  `).all(userId, start, end) as WeeklyExerciseStat[];

  const activities = db.prepare(`
    SELECT activity_type, COUNT(*) as count, SUM(duration_minutes) as total_mins
    FROM activity_sessions
    WHERE user_id = ? AND session_date >= ? AND session_date <= ?
    GROUP BY activity_type
  `).all(userId, start, end) as WeeklyActivityStat[];

  // Need some data to generate an insight
  if (exercises.length === 0 && activities.length === 0) {
    return NextResponse.json({ insight: null });
  }

  // Format week label
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const weekLabel = `${fmt(startDate)} – ${fmt(endDate)} ${endDate.getFullYear()}`;

  const userName = session.user.name || 'there';

  const insight = await generateWeeklyInsight({
    userName,
    weekLabel,
    exercises,
    activities,
  });

  // Cache the result
  if (insight) {
    try {
      db.prepare(
        'INSERT OR REPLACE INTO weekly_insights (user_id, week_start, insight) VALUES (?, ?, ?)'
      ).run(userId, start, insight);
    } catch {
      // Ignore cache write errors
    }
  }

  return NextResponse.json({ insight });
}
