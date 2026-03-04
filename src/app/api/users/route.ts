import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = db
    .prepare('SELECT id, name, avatar_url as avatarUrl FROM users')
    .all() as Array<{ id: number; name: string; avatarUrl: string | null }>;

  return NextResponse.json({ users });
}
