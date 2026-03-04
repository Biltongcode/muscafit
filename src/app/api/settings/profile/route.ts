import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const user = db
    .prepare('SELECT id, name, email FROM users WHERE id = ?')
    .get(userId) as { id: number; name: string; email: string } | undefined;

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const body = await req.json();
  const { name, email } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  }

  // Check email uniqueness (excluding self)
  const existing = db
    .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(email.trim(), userId);

  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(
    name.trim(),
    email.trim(),
    userId
  );

  const updated = db
    .prepare('SELECT id, name, email FROM users WHERE id = ?')
    .get(userId);

  return NextResponse.json({ user: updated });
}
