import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { createConnection } from '@/lib/connections';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.NOTIFICATION_FROM || 'Muscafit <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL || 'https://train.biltongcodes.com';

// POST: Send an invite
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const body = await req.json();
  const email = body.email?.trim()?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Check if already connected (if user exists)
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;
  if (existingUser) {
    const alreadyConnected = db.prepare(
      'SELECT 1 FROM user_connections WHERE user_id = ? AND connected_user_id = ?'
    ).get(userId, existingUser.id);
    if (alreadyConnected) {
      return NextResponse.json({ error: 'You are already connected to this person' }, { status: 400 });
    }
    if (existingUser.id === userId) {
      return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });
    }
  }

  // Check for existing pending invite
  const existingInvite = db.prepare(
    "SELECT id FROM connection_invites WHERE inviter_id = ? AND email = ? AND status = 'pending'"
  ).get(userId, email);
  if (existingInvite) {
    return NextResponse.json({ error: 'You already have a pending invite to this email' }, { status: 400 });
  }

  // Create invite
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(
    'INSERT INTO connection_invites (inviter_id, email, token) VALUES (?, ?, ?)'
  ).run(userId, email, token);

  // Send invite email
  const inviterName = session.user.name || 'Someone';
  const registerUrl = `${APP_URL}/register?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `${inviterName} invited you to Muscafit`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 16px;">You're invited to Muscafit!</h2>
          <p style="color: #4a4a4a; line-height: 1.6;">
            <strong>${inviterName}</strong> wants to connect with you on Muscafit — a strength training tracker where you can
            log exercises, set goals, and keep each other motivated.
          </p>
          <a href="${registerUrl}"
             style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Join Muscafit
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            If you didn't expect this invite, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Muscafit] Failed to send invite email:', err);
    // Don't fail the request — the invite is still created
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

// PUT: Accept or decline a received invite
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const body = await req.json();
  const { inviteId, action } = body;

  if (!inviteId || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'inviteId and action (accept/decline) required' }, { status: 400 });
  }

  // Verify this invite is for this user's email
  const userEmail = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string };
  const invite = db.prepare(
    "SELECT id, inviter_id FROM connection_invites WHERE id = ? AND email = ? AND status = 'pending'"
  ).get(inviteId, userEmail.email) as { id: number; inviter_id: number } | undefined;

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found or already processed' }, { status: 404 });
  }

  if (action === 'accept') {
    createConnection(userId, invite.inviter_id);
    db.prepare("UPDATE connection_invites SET status = 'accepted' WHERE id = ?").run(invite.id);
  } else {
    db.prepare("UPDATE connection_invites SET status = 'declined' WHERE id = ?").run(invite.id);
  }

  return NextResponse.json({ success: true });
}

// DELETE: Cancel a sent invite
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { searchParams } = new URL(req.url);
  const inviteId = Number(searchParams.get('id'));

  if (!inviteId) {
    return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
  }

  db.prepare(
    "DELETE FROM connection_invites WHERE id = ? AND inviter_id = ? AND status = 'pending'"
  ).run(inviteId, userId);

  return NextResponse.json({ success: true });
}
