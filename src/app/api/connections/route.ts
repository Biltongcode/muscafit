import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { removeConnection } from '@/lib/connections';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);

  // Current connections
  const connections = db.prepare(`
    SELECT u.id, u.name, u.email, uc.created_at as connectedAt
    FROM user_connections uc
    JOIN users u ON u.id = uc.connected_user_id
    WHERE uc.user_id = ?
    ORDER BY u.name
  `).all(userId) as Array<{ id: number; name: string; email: string; connectedAt: string }>;

  // Sent pending invites
  const sentInvites = db.prepare(`
    SELECT id, email, created_at as createdAt
    FROM connection_invites
    WHERE inviter_id = ? AND status = 'pending'
    ORDER BY created_at DESC
  `).all(userId) as Array<{ id: number; email: string; createdAt: string }>;

  // Received pending invites (where an existing user was invited by email)
  const userEmail = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string };
  const receivedInvites = db.prepare(`
    SELECT ci.id, ci.token, u.name as inviterName, ci.created_at as createdAt
    FROM connection_invites ci
    JOIN users u ON u.id = ci.inviter_id
    WHERE ci.email = ? AND ci.status = 'pending'
    ORDER BY ci.created_at DESC
  `).all(userEmail.email) as Array<{ id: number; token: string; inviterName: string; createdAt: string }>;

  return NextResponse.json({ connections, sentInvites, receivedInvites });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { searchParams } = new URL(req.url);
  const connectedUserId = Number(searchParams.get('userId'));

  if (!connectedUserId) {
    return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
  }

  removeConnection(userId, connectedUserId);

  return NextResponse.json({ success: true });
}
