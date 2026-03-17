import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { getVisibleUserIds, inPlaceholders } from '@/lib/connections';

// GET /api/reactions?date=YYYY-MM-DD — get all fire reactions for a date's logs
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
  }

  const userId = Number(session.user.id);
  const visibleIds = getVisibleUserIds(userId);

  // Get all reactions for exercise logs on this date for visible users
  const reactions = db.prepare(`
    SELECT fr.log_id, fr.user_id, u.name as user_name
    FROM fire_reactions fr
    JOIN exercise_logs el ON el.id = fr.log_id
    JOIN users u ON u.id = fr.user_id
    WHERE el.log_date = ?
      AND el.user_id IN ${inPlaceholders(visibleIds)}
  `).all(date, ...visibleIds) as Array<{
    log_id: number;
    user_id: number;
    user_name: string;
  }>;

  // Group by log_id
  const byLog: Record<number, Array<{ userId: number; userName: string }>> = {};
  for (const r of reactions) {
    if (!byLog[r.log_id]) byLog[r.log_id] = [];
    byLog[r.log_id].push({ userId: r.user_id, userName: r.user_name });
  }

  return NextResponse.json({ reactions: byLog });
}

// POST /api/reactions — toggle a fire reaction on/off
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { logId } = await req.json();
  if (!logId) {
    return NextResponse.json({ error: 'logId required' }, { status: 400 });
  }

  const userId = Number(session.user.id);

  // Verify the log exists and belongs to a visible user (not yourself)
  const visibleIds = getVisibleUserIds(userId);
  const log = db.prepare(`
    SELECT el.id, el.user_id FROM exercise_logs el
    WHERE el.id = ? AND el.user_id IN ${inPlaceholders(visibleIds)}
  `).get(logId, ...visibleIds) as { id: number; user_id: number } | undefined;

  if (!log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 });
  }

  if (log.user_id === userId) {
    return NextResponse.json({ error: 'Cannot react to your own exercise' }, { status: 400 });
  }

  // Toggle: if exists, remove; if not, add
  const existing = db.prepare(
    'SELECT id FROM fire_reactions WHERE user_id = ? AND log_id = ?'
  ).get(userId, logId);

  if (existing) {
    db.prepare('DELETE FROM fire_reactions WHERE user_id = ? AND log_id = ?').run(userId, logId);
    return NextResponse.json({ fired: false });
  } else {
    db.prepare('INSERT INTO fire_reactions (user_id, log_id) VALUES (?, ?)').run(userId, logId);
    return NextResponse.json({ fired: true });
  }
}
