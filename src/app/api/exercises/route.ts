import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const exercises = db
    .prepare(
      `SELECT id, name, target_type, target_value, target_sets, target_per_set, notes, sort_order, is_active
       FROM exercises WHERE user_id = ? AND is_active = 1 ORDER BY sort_order`
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
  const { name, targetType, targetValue, targetSets, targetPerSet, notes } = body;

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
      `INSERT INTO exercises (user_id, name, target_type, target_value, target_sets, target_per_set, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(userId, name, targetType, targetValue ?? null, targetSets ?? null, targetPerSet ?? null, notes ?? null, maxOrder.max_order + 1);

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
