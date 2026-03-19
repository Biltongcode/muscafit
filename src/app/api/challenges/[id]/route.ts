import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

// PUT: Update challenge status (accept/decline/complete)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number(session.user.id);
  const challengeId = Number(params.id);
  const { action } = await req.json();

  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId) as {
    id: number; challenger_id: number; challenged_id: number; status: string; challenge_date: string;
  } | undefined;

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  if (action === 'accept') {
    if (challenge.challenged_id !== userId) {
      return NextResponse.json({ error: 'Only the challenged user can accept' }, { status: 403 });
    }
    if (challenge.status !== 'pending') {
      return NextResponse.json({ error: 'Challenge already responded to' }, { status: 400 });
    }
    db.prepare('UPDATE challenges SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('accepted', challengeId);
    return NextResponse.json({ success: true, status: 'accepted' });
  }

  if (action === 'decline') {
    if (challenge.challenged_id !== userId) {
      return NextResponse.json({ error: 'Only the challenged user can decline' }, { status: 403 });
    }
    if (challenge.status !== 'pending') {
      return NextResponse.json({ error: 'Challenge already responded to' }, { status: 400 });
    }
    db.prepare('UPDATE challenges SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('declined', challengeId);
    return NextResponse.json({ success: true, status: 'declined' });
  }

  if (action === 'complete') {
    if (challenge.challenged_id !== userId) {
      return NextResponse.json({ error: 'Only the challenged user can complete' }, { status: 403 });
    }
    if (challenge.status !== 'accepted') {
      return NextResponse.json({ error: 'Challenge must be accepted first' }, { status: 400 });
    }
    db.prepare('UPDATE challenges SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('completed', challengeId);
    return NextResponse.json({ success: true, status: 'completed' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
