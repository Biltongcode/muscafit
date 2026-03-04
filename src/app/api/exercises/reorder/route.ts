import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const body = await req.json();
  const { order } = body; // array of exercise IDs in new order

  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'order array required' }, { status: 400 });
  }

  const update = db.prepare(
    'UPDATE exercises SET sort_order = ? WHERE id = ? AND user_id = ?'
  );

  const updateAll = db.transaction(() => {
    for (let i = 0; i < order.length; i++) {
      update.run(i + 1, order[i], userId);
    }
  });

  updateAll();

  return NextResponse.json({ success: true });
}
