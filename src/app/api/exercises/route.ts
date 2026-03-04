import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const includeInactive = req.nextUrl.searchParams.get('all') === '1';
  const browseUserId = req.nextUrl.searchParams.get('user_id');

  if (browseUserId) {
    // Viewing another user's active exercises (read-only)
    const user = db
      .prepare('SELECT id, name FROM users WHERE id = ?')
      .get(Number(browseUserId)) as { id: number; name: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const exercises = db
      .prepare(
        `SELECT id, name, target_type, target_value, target_sets, target_per_set, notes, sort_order, is_active, schedule_days
         FROM exercises WHERE user_id = ? AND is_active = 1 ORDER BY sort_order`
      )
      .all(Number(browseUserId));

    return NextResponse.json({ exercises, userName: user.name });
  }

  const exercises = db
    .prepare(
      `SELECT id, name, target_type, target_value, target_sets, target_per_set, notes, sort_order, is_active, schedule_days
       FROM exercises WHERE user_id = ? ${includeInactive ? '' : 'AND is_active = 1'} ORDER BY sort_order`
    )
    .all(Number(session.user.id));

  return NextResponse.json({ exercises });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, targetType, targetValue, targetSets, targetPerSet, notes, scheduleDays } = body;

  if (!name || !targetType) {
    return NextResponse.json({ error: 'Name and targetType are required' }, { status: 400 });
  }

  const userId = Number(session.user.id);

  // Get next sort order
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM exercises WHERE user_id = ?')
    .get(userId) as { max_order: number };

  const result = db
    .prepare(
      `INSERT INTO exercises (user_id, name, target_type, target_value, target_sets, target_per_set, notes, sort_order, schedule_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(userId, name, targetType, targetValue ?? null, targetSets ?? null, targetPerSet ?? null, notes ?? null, maxOrder.max_order + 1, scheduleDays ?? null);

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
