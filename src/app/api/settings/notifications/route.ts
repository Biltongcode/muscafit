import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

interface Settings {
  notifications_enabled: number;
  evening_reminder_enabled: number;
  evening_reminder_hour: number;
  morning_summary_enabled: number;
  morning_summary_hour: number;
  notification_email: string | null;
}

const DEFAULTS: Settings = {
  notifications_enabled: 1,
  evening_reminder_enabled: 1,
  evening_reminder_hour: 20,
  morning_summary_enabled: 1,
  morning_summary_hour: 7,
  notification_email: null,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const row = db
    .prepare('SELECT * FROM user_settings WHERE user_id = ?')
    .get(userId) as (Settings & { user_id: number }) | undefined;

  if (!row) {
    return NextResponse.json({ settings: DEFAULTS });
  }

  return NextResponse.json({
    settings: {
      notifications_enabled: row.notifications_enabled,
      evening_reminder_enabled: row.evening_reminder_enabled,
      evening_reminder_hour: row.evening_reminder_hour,
      morning_summary_enabled: row.morning_summary_enabled,
      morning_summary_hour: row.morning_summary_hour,
      notification_email: row.notification_email,
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const body = await req.json();

  const settings = {
    notifications_enabled: body.notifications_enabled ?? DEFAULTS.notifications_enabled,
    evening_reminder_enabled: body.evening_reminder_enabled ?? DEFAULTS.evening_reminder_enabled,
    evening_reminder_hour: body.evening_reminder_hour ?? DEFAULTS.evening_reminder_hour,
    morning_summary_enabled: body.morning_summary_enabled ?? DEFAULTS.morning_summary_enabled,
    morning_summary_hour: body.morning_summary_hour ?? DEFAULTS.morning_summary_hour,
    notification_email: body.notification_email || null,
  };

  db.prepare(`
    INSERT INTO user_settings (user_id, notifications_enabled, evening_reminder_enabled,
      evening_reminder_hour, morning_summary_enabled, morning_summary_hour, notification_email, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      notifications_enabled = excluded.notifications_enabled,
      evening_reminder_enabled = excluded.evening_reminder_enabled,
      evening_reminder_hour = excluded.evening_reminder_hour,
      morning_summary_enabled = excluded.morning_summary_enabled,
      morning_summary_hour = excluded.morning_summary_hour,
      notification_email = excluded.notification_email,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    userId,
    settings.notifications_enabled,
    settings.evening_reminder_enabled,
    settings.evening_reminder_hour,
    settings.morning_summary_enabled,
    settings.morning_summary_hour,
    settings.notification_email
  );

  return NextResponse.json({ settings });
}
