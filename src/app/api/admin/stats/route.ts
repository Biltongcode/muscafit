import { NextResponse } from 'next/server';
import { requireAdmin, forbiddenResponse } from '@/lib/admin';
import db from '@/lib/db';

export async function GET() {
  const session = await requireAdmin();
  if (!session) return forbiddenResponse();

  const { total_users } = db.prepare(
    'SELECT COUNT(*) as total_users FROM users'
  ).get() as { total_users: number };

  const { active_users } = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as active_users
    FROM exercise_logs
    WHERE completed = 1
      AND completed_at >= datetime('now', '-7 days')
  `).get() as { active_users: number };

  const { week_completions } = db.prepare(`
    SELECT COUNT(*) as week_completions
    FROM exercise_logs
    WHERE completed = 1
      AND log_date >= date('now', '-7 days')
  `).get() as { week_completions: number };

  const { month_completions } = db.prepare(`
    SELECT COUNT(*) as month_completions
    FROM exercise_logs
    WHERE completed = 1
      AND log_date >= date('now', 'start of month')
  `).get() as { month_completions: number };

  const recentActivity = db.prepare(`
    SELECT
      el.id,
      u.name as user_name,
      e.name as exercise_name,
      el.log_date,
      el.actual_value,
      el.actual_sets,
      el.completed_at
    FROM exercise_logs el
    JOIN users u ON u.id = el.user_id
    JOIN exercises e ON e.id = el.exercise_id
    WHERE el.completed = 1
    ORDER BY el.completed_at DESC
    LIMIT 15
  `).all();

  return NextResponse.json({
    totalUsers: total_users,
    activeUsers: active_users,
    weekCompletions: week_completions,
    monthCompletions: month_completions,
    recentActivity,
  });
}
