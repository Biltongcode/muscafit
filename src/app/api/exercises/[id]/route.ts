import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const exerciseId = Number(params.id);
  const userId = Number(session.user.id);

  // Verify ownership
  const exercise = db
    .prepare('SELECT id FROM exercises WHERE id = ? AND user_id = ?')
    .get(exerciseId, userId);

  if (!exercise) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const { name, targetType, targetValue, targetSets, targetPerSet, notes, sortOrder, isActive } = body;

  db.prepare(
    `UPDATE exercises SET
       name = COALESCE(?, name),
       target_type = COALESCE(?, target_type),
       target_value = COALESCE(?, target_value),
       target_sets = COALESCE(?, target_sets),
       target_per_set = COALESCE(?, target_per_set),
       notes = COALESCE(?, notes),
       sort_order = COALESCE(?, sort_order),
       is_active = COALESCE(?, is_active)
     WHERE id = ? AND user_id = ?`
  ).run(
    name ?? null, targetType ?? null, targetValue ?? null,
    targetSets ?? null, targetPerSet ?? null, notes ?? null,
    sortOrder ?? null, isActive ?? null,
    exerciseId, userId
  );

  return NextResponse.json({ success: true });
}
