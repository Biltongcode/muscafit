import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import path from 'path';
import fs from 'fs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, WebP, or GIF.' }, { status: 400 });
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Max 2MB.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${userId}-${Date.now()}.jpg`;
  const avatarsDir = path.join(process.cwd(), 'public', 'avatars');

  // Ensure directory exists
  fs.mkdirSync(avatarsDir, { recursive: true });

  // Get old avatar URL before updating
  const oldRow = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(userId) as { avatar_url: string | null } | undefined;
  const oldAvatarUrl = oldRow?.avatar_url;

  // Write new file
  fs.writeFileSync(path.join(avatarsDir, filename), buffer);

  // Update database
  const avatarUrl = `/avatars/${filename}`;
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, userId);

  // Delete old auto-generated avatar file (only files with {userId}-{timestamp} pattern)
  if (oldAvatarUrl && oldAvatarUrl.startsWith('/avatars/')) {
    const oldBasename = path.basename(oldAvatarUrl);
    if (oldBasename.startsWith(`${userId}-`)) {
      const oldPath = path.join(avatarsDir, oldBasename);
      try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
    }
  }

  return NextResponse.json({ avatarUrl });
}
