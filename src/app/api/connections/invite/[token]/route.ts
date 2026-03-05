import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  const invite = db.prepare(`
    SELECT ci.id, ci.email, ci.status, u.name as inviter_name
    FROM connection_invites ci
    JOIN users u ON u.id = ci.inviter_id
    WHERE ci.token = ?
  `).get(token) as { id: number; email: string; status: string; inviter_name: string } | undefined;

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 });
  }

  return NextResponse.json({
    email: invite.email,
    inviterName: invite.inviter_name,
  });
}
