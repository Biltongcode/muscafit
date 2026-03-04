import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startDate = req.nextUrl.searchParams.get('start');
  const endDate = req.nextUrl.searchParams.get('end');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'start and end parameters required' }, { status: 400 });
  }

  const allUsers = db.prepare('SELECT id, name FROM users').all() as Array<{ id: number; name: string }>;

  // Get exercise counts per user per day (only active exercises)
  const logStats = db.prepare(
    `SELECT
       el.user_id,
       el.log_date,
       COUNT(*) as total,
       SUM(CASE WHEN el.completed = 1 THEN 1 ELSE 0 END) as completed
     FROM exercise_logs el
     JOIN exercises e ON e.id = el.exercise_id AND e.is_active = 1
     WHERE el.log_date >= ? AND el.log_date <= ?
     GROUP BY el.user_id, el.log_date`
  ).all(startDate, endDate) as Array<{
    user_id: number;
    log_date: string;
    total: number;
    completed: number;
  }>;

  // Get activities per user per day
  const activityStats = db.prepare(
    `SELECT user_id, session_date, activity_type
     FROM activity_sessions
     WHERE session_date >= ? AND session_date <= ?
     ORDER BY session_date`
  ).all(startDate, endDate) as Array<{
    user_id: number;
    session_date: string;
    activity_type: string;
  }>;

  // Build response grouped by user
  const users = allUsers.map((user) => {
    // Build a map of date -> stats
    const days: Record<string, { completed: number; total: number; activities: string[] }> = {};

    // Generate all dates in range
    const current = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      days[dateStr] = { completed: 0, total: 0, activities: [] };
      current.setDate(current.getDate() + 1);
    }

    // Fill in exercise stats
    for (const stat of logStats) {
      if (stat.user_id === user.id && days[stat.log_date]) {
        days[stat.log_date].completed = stat.completed;
        days[stat.log_date].total = stat.total;
      }
    }

    // Fill in activities
    for (const act of activityStats) {
      if (act.user_id === user.id && days[act.session_date]) {
        days[act.session_date].activities.push(act.activity_type);
      }
    }

    return { id: user.id, name: user.name, days };
  });

  return NextResponse.json({ users });
}
