import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { getVisibleUserIds, inPlaceholders } from '@/lib/connections';

// GET: Token tallies for all visible users
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number(session.user.id);
  const visibleIds = getVisibleUserIds(userId);
  const placeholders = inPlaceholders(visibleIds);

  // Get completed (beer) and failed (poop) counts per user
  const stats = db.prepare(`
    SELECT
      c.challenged_id as user_id,
      u.name as user_name,
      SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as beers,
      SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END) as poops
    FROM challenges c
    JOIN users u ON u.id = c.challenged_id
    WHERE c.challenged_id IN (${placeholders})
      AND c.status IN ('completed', 'failed')
    GROUP BY c.challenged_id
    ORDER BY beers DESC
  `).all(...visibleIds) as Array<{
    user_id: number; user_name: string; beers: number; poops: number;
  }>;

  return NextResponse.json({ stats });
}
