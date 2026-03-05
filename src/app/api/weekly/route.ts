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

  const startDate = req.nextUrl.searchParams.get('start');
  const endDate = req.nextUrl.searchParams.get('end');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'start and end parameters required' }, { status: 400 });
  }

  const sessionUserId = Number(session.user.id);
  const visibleIds = getVisibleUserIds(sessionUserId);

  const allUsers = db.prepare(`SELECT id, name, avatar_url FROM users WHERE id IN ${inPlaceholders(visibleIds)}`).all(...visibleIds) as Array<{ id: number; name: string; avatar_url: string | null }>;

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
       AND el.user_id IN ${inPlaceholders(visibleIds)}
     GROUP BY el.user_id, el.log_date`
  ).all(startDate, endDate, ...visibleIds) as Array<{
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
       AND user_id IN ${inPlaceholders(visibleIds)}
     ORDER BY session_date`
  ).all(startDate, endDate, ...visibleIds) as Array<{
    user_id: number;
    session_date: string;
    activity_type: string;
  }>;

  // Get each user's exercises with schedule info for computing per-day totals
  const getUserExercises = db.prepare(
    'SELECT id, schedule_days FROM exercises WHERE user_id = ? AND is_active = 1'
  );

  function getScheduledCount(exercises: Array<{ id: number; schedule_days: string | null }>, dateStr: string): number {
    const d = new Date(dateStr + 'T12:00:00');
    const jsDay = d.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    return exercises.filter(ex => {
      if (!ex.schedule_days) return true;
      return ex.schedule_days.split(',').includes(String(isoDay));
    }).length;
  }

  // Build response grouped by user
  const users = allUsers.map((user) => {
    const userExercises = getUserExercises.all(user.id) as Array<{ id: number; schedule_days: string | null }>;

    // Build a map of date -> stats
    const days: Record<string, { completed: number; total: number; activities: string[]; isRestDay: boolean }> = {};

    // Generate all dates in range
    const current = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const scheduledTotal = getScheduledCount(userExercises, dateStr);
      days[dateStr] = { completed: 0, total: scheduledTotal, activities: [], isRestDay: userExercises.length > 0 && scheduledTotal === 0 };
      current.setDate(current.getDate() + 1);
    }

    // Fill in completed counts from logs
    for (const stat of logStats) {
      if (stat.user_id === user.id && days[stat.log_date]) {
        days[stat.log_date].completed = stat.completed;
      }
    }

    // Fill in activities
    for (const act of activityStats) {
      if (act.user_id === user.id && days[act.session_date]) {
        days[act.session_date].activities.push(act.activity_type);
      }
    }

    return { id: user.id, name: user.name, avatarUrl: user.avatar_url, days };
  });

  return NextResponse.json({ users });
}
