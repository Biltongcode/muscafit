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

  const period = req.nextUrl.searchParams.get('period') || 'month';
  const { start, end } = getDateRange(period);

  const sessionUserId = Number(session.user.id);
  const visibleIds = getVisibleUserIds(sessionUserId);

  // Exercise totals grouped by exercise name and user
  const exerciseRows = db.prepare(`
    SELECT
      e.name as exercise_name,
      e.target_type,
      el.user_id,
      u.name as user_name,
      SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) ELSE 0 END) as total_value,
      COUNT(CASE WHEN el.completed = 1 THEN 1 END) as days_completed
    FROM exercise_logs el
    JOIN exercises e ON e.id = el.exercise_id
    JOIN users u ON u.id = el.user_id
    WHERE el.log_date >= ? AND el.log_date <= ?
      AND el.user_id IN ${inPlaceholders(visibleIds)}
    GROUP BY e.name, el.user_id
    ORDER BY e.name, el.user_id
  `).all(start, end, ...visibleIds) as Array<{
    exercise_name: string;
    target_type: string;
    user_id: number;
    user_name: string;
    total_value: number;
    days_completed: number;
  }>;

  // Group by exercise name
  const exerciseMap = new Map<string, {
    exerciseName: string;
    targetType: string;
    users: Array<{ userId: number; userName: string; totalValue: number; daysCompleted: number }>;
    combinedTotal: number;
  }>();

  for (const row of exerciseRows) {
    if (!exerciseMap.has(row.exercise_name)) {
      exerciseMap.set(row.exercise_name, {
        exerciseName: row.exercise_name,
        targetType: row.target_type,
        users: [],
        combinedTotal: 0,
      });
    }
    const entry = exerciseMap.get(row.exercise_name)!;
    entry.users.push({
      userId: row.user_id,
      userName: row.user_name,
      totalValue: row.total_value,
      daysCompleted: row.days_completed,
    });
    entry.combinedTotal += row.total_value;
  }

  // Activity summary
  const activityRows = db.prepare(`
    SELECT
      a.user_id,
      u.name as user_name,
      a.activity_type,
      COUNT(*) as count,
      COALESCE(SUM(a.duration_minutes), 0) as total_minutes
    FROM activity_sessions a
    JOIN users u ON u.id = a.user_id
    WHERE a.session_date >= ? AND a.session_date <= ?
      AND a.user_id IN ${inPlaceholders(visibleIds)}
    GROUP BY a.user_id, a.activity_type
    ORDER BY u.name, a.activity_type
  `).all(start, end, ...visibleIds) as Array<{
    user_id: number;
    user_name: string;
    activity_type: string;
    count: number;
    total_minutes: number;
  }>;

  return NextResponse.json({
    period,
    dateRange: { start, end },
    exercises: Array.from(exerciseMap.values()),
    activities: activityRows.map(r => ({
      userId: r.user_id,
      userName: r.user_name,
      activityType: r.activity_type,
      count: r.count,
      totalMinutes: r.total_minutes,
    })),
  });
}

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (period === 'month') {
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }
  if (period === 'year') {
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  // 'all'
  return { start: '2000-01-01', end: `${y}-12-31` };
}
