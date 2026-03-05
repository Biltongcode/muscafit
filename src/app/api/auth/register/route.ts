import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { createConnection } from '@/lib/connections';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password, token } = body;

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: 'An invite token is required to register' }, { status: 400 });
  }

  // Validate invite token
  const invite = db.prepare(
    "SELECT id, inviter_id, email FROM connection_invites WHERE token = ? AND status = 'pending'"
  ).get(token) as { id: number; inviter_id: number; email: string } | undefined;

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });
  }

  // Email must match the invite
  if (invite.email.toLowerCase() !== email.trim().toLowerCase()) {
    return NextResponse.json({ error: 'Email does not match the invite' }, { status: 400 });
  }

  // Check if email already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run(name.trim(), email.trim().toLowerCase(), passwordHash);

  const newUserId = Number(result.lastInsertRowid);

  // Create connection between new user and inviter
  createConnection(newUserId, invite.inviter_id);

  // Mark invite as accepted
  db.prepare("UPDATE connection_invites SET status = 'accepted' WHERE id = ?").run(invite.id);

  return NextResponse.json({ success: true, userId: newUserId }, { status: 201 });
}
