import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin, forbiddenResponse } from '@/lib/admin';
import db from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return forbiddenResponse();

  const userId = Number(params.id);

  const user = db.prepare('SELECT id, name FROM users WHERE id = ?')
    .get(userId) as { id: number; name: string } | undefined;

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(passwordHash, userId);

  return NextResponse.json({
    success: true,
    tempPassword,
    message: `Password reset for ${user.name}`,
  });
}

function generateTempPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}
