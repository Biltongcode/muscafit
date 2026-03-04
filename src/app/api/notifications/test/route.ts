import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTestEmail } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const type = body.type as 'evening' | 'morning';

  if (!type || !['evening', 'morning'].includes(type)) {
    return NextResponse.json({ error: 'type must be "evening" or "morning"' }, { status: 400 });
  }

  try {
    const result = await sendTestEmail(Number(session.user.id), type);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[Muscafit] Test email error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send test email' },
      { status: 500 }
    );
  }
}
