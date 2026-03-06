import { NextResponse } from 'next/server';
import { requireAdmin, forbiddenResponse } from '@/lib/admin';
import db from '@/lib/db';

export async function GET() {
  const session = await requireAdmin();
  if (!session) return forbiddenResponse();

  const users = db.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.avatar_url,
      u.created_at,
      (SELECT MAX(el.completed_at) FROM exercise_logs el
       WHERE el.user_id = u.id AND el.completed = 1) as last_active,
      (SELECT COUNT(*) FROM exercise_logs el
       WHERE el.user_id = u.id AND el.completed = 1) as total_completions,
      (SELECT COUNT(DISTINCT el.log_date) FROM exercise_logs el
       WHERE el.user_id = u.id AND el.completed = 1) as active_days,
      (SELECT COUNT(*) FROM exercises ex
       WHERE ex.user_id = u.id AND ex.is_active = 1) as exercise_count,
      (SELECT COUNT(*) FROM user_connections uc
       WHERE uc.user_id = u.id) as connection_count
    FROM users u
    ORDER BY u.created_at ASC
  `).all();

  return NextResponse.json({ users });
}
