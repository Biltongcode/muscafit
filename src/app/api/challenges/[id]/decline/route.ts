import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

const APP_URL = process.env.NEXTAUTH_URL || 'https://train.biltongcodes.com';

// GET: Decline challenge via email link
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const challengeId = Number(params.id);
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/daily?error=invalid_token`);
  }

  const challenge = db.prepare(
    'SELECT * FROM challenges WHERE id = ? AND accept_token = ?'
  ).get(challengeId, token) as { id: number; status: string } | undefined;

  if (!challenge) {
    return NextResponse.redirect(`${APP_URL}/daily?error=challenge_not_found`);
  }

  if (challenge.status !== 'pending') {
    return NextResponse.redirect(`${APP_URL}/daily?info=already_responded`);
  }

  db.prepare('UPDATE challenges SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('declined', challengeId);

  return NextResponse.redirect(`${APP_URL}/daily?info=challenge_declined`);
}
