import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { getVisibleUserIds } from '@/lib/connections';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const goalId = Number(params.id);
  const userId = Number(session.user.id);

  // Verify the goal exists — individual goals must belong to this user, group goals only creator can delete
  const goal = db.prepare('SELECT id, scope, user_id, created_by_id FROM goals WHERE id = ?').get(goalId) as
    | { id: number; scope: string; user_id: number | null; created_by_id: number | null }
    | undefined;

  if (!goal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (goal.scope === 'individual' && goal.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (goal.scope === 'group' && goal.created_by_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  db.prepare('DELETE FROM goals WHERE id = ?').run(goalId);

  return NextResponse.json({ success: true });
}
