import cron from 'node-cron';
import { Resend } from 'resend';
import db from './db';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.NOTIFICATION_FROM || 'Muscafit <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL || 'https://train.biltongcodes.com';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface UserWithSettings {
  id: number;
  name: string;
  email: string;
  notifications_enabled: number | null;
  evening_reminder_enabled: number | null;
  evening_reminder_hour: number | null;
  morning_summary_enabled: number | null;
  morning_summary_hour: number | null;
  notification_email: string | null;
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getUsersWithSettings(): UserWithSettings[] {
  return db.prepare(`
    SELECT u.id, u.name, u.email,
           us.notifications_enabled, us.evening_reminder_enabled,
           us.evening_reminder_hour, us.morning_summary_enabled,
           us.morning_summary_hour, us.notification_email
    FROM users u
    LEFT JOIN user_settings us ON u.id = us.user_id
  `).all() as UserWithSettings[];
}

// --- Evening Reminder ---
// Checks if user has 0 completed exercises today, sends a nudge

async function sendEveningReminders() {
  const today = getTodayStr();
  const users = getUsersWithSettings();
  const currentHour = new Date().getHours();

  for (const user of users) {
    // Check if notifications are enabled (default to enabled if no settings row)
    const enabled = user.notifications_enabled ?? 1;
    const eveningEnabled = user.evening_reminder_enabled ?? 1;
    const reminderHour = user.evening_reminder_hour ?? 20;

    if (!enabled || !eveningEnabled || currentHour !== reminderHour) continue;

    // Check completion
    const result = db.prepare(`
      SELECT COUNT(*) as completed,
             (SELECT COUNT(*) FROM exercises WHERE user_id = ? AND is_active = 1) as total
      FROM exercise_logs
      WHERE user_id = ? AND log_date = ? AND completed = 1
    `).get(user.id, user.id, today) as { completed: number; total: number };

    // Only send if they have exercises but completed 0
    if (result.total === 0 || result.completed > 0) continue;

    const toEmail = user.notification_email || user.email;

    try {
      await resend.emails.send({
        from: FROM,
        to: toEmail,
        subject: "\uD83D\uDCAA Don't forget to log your training today",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a; margin-bottom: 16px;">Hey ${escapeHtml(user.name)}!</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">
              You haven't logged any exercises today yet. You've got
              <strong>${result.total} exercise${result.total !== 1 ? 's' : ''}</strong> waiting for you.
            </p>
            <a href="${APP_URL}"
               style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Log Your Training
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Sent by Muscafit. You can turn off reminders in your settings.
            </p>
          </div>
        `,
      });
      console.log(`[Muscafit] Evening reminder sent to ${user.name} (${toEmail})`);
    } catch (err) {
      console.error(`[Muscafit] Failed to send evening reminder to ${user.name}:`, err);
    }
  }
}

// --- Morning Summary ---
// Shows what the OTHER users did yesterday

async function sendMorningSummaries() {
  const yesterday = getYesterdayStr();
  const users = getUsersWithSettings();
  const currentHour = new Date().getHours();

  for (const user of users) {
    const enabled = user.notifications_enabled ?? 1;
    const morningEnabled = user.morning_summary_enabled ?? 1;
    const summaryHour = user.morning_summary_hour ?? 7;

    if (!enabled || !morningEnabled || currentHour !== summaryHour) continue;

    // Get other users' data for yesterday
    const otherUsers = users.filter((u) => u.id !== user.id);
    const summaryParts: string[] = [];

    for (const other of otherUsers) {
      const exercises = db.prepare(`
        SELECT e.name, el.completed
        FROM exercise_logs el
        JOIN exercises e ON e.id = el.exercise_id
        WHERE el.user_id = ? AND el.log_date = ?
        ORDER BY e.sort_order
      `).all(other.id, yesterday) as Array<{ name: string; completed: number }>;

      const activities = db.prepare(`
        SELECT activity_type, duration_minutes
        FROM activity_sessions
        WHERE user_id = ? AND session_date = ?
      `).all(other.id, yesterday) as Array<{ activity_type: string; duration_minutes: number | null }>;

      const comments = db.prepare(`
        SELECT body,
               (SELECT name FROM users WHERE id = c.author_id) as author_name
        FROM comments c
        WHERE target_user_id = ? AND comment_date = ?
      `).all(other.id, yesterday) as Array<{ body: string; author_name: string }>;

      const completed = exercises.filter((e) => e.completed).length;
      const total = exercises.length;

      let section = `<h3 style="color: #1a1a1a; margin: 16px 0 8px;">${escapeHtml(other.name)}</h3>`;

      if (total > 0) {
        const color = completed === total ? '#16a34a' : completed > 0 ? '#d97706' : '#9ca3af';
        section += `<p style="color: ${color}; font-weight: 600; margin: 4px 0;">Exercises: ${completed}/${total} completed</p>`;

        if (completed > 0) {
          const completedNames = exercises.filter((e) => e.completed).map((e) => escapeHtml(e.name));
          section += `<p style="color: #6b7280; font-size: 14px; margin: 2px 0;">${completedNames.join(', ')}</p>`;
        }
      } else {
        section += `<p style="color: #9ca3af; margin: 4px 0;">No exercises configured</p>`;
      }

      if (activities.length > 0) {
        const activityStrs = activities.map((a) => {
          const label = escapeHtml(a.activity_type.charAt(0).toUpperCase() + a.activity_type.slice(1));
          return a.duration_minutes ? `${label} (${a.duration_minutes}min)` : label;
        });
        section += `<p style="color: #4a4a4a; font-size: 14px; margin: 4px 0;">\u{1F3C3} ${activityStrs.join(', ')}</p>`;
      }

      if (comments.length > 0) {
        section += `<div style="margin-top: 8px;">`;
        for (const c of comments) {
          section += `<p style="color: #6b7280; font-size: 13px; margin: 2px 0; padding-left: 8px; border-left: 2px solid #e5e7eb;">
            <strong>${escapeHtml(c.author_name)}:</strong> ${escapeHtml(c.body)}
          </p>`;
        }
        section += `</div>`;
      }

      summaryParts.push(section);
    }

    if (summaryParts.length === 0) continue;

    const toEmail = user.notification_email || user.email;
    const yesterdayFormatted = new Date(yesterday + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    try {
      await resend.emails.send({
        from: FROM,
        to: toEmail,
        subject: `\u{1F4CA} Training summary for ${yesterdayFormatted}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a; margin-bottom: 4px;">Morning Summary</h2>
            <p style="color: #6b7280; margin-top: 0;">${yesterdayFormatted}</p>
            ${summaryParts.join('<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">')}
            <a href="${APP_URL}"
               style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Open Muscafit
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Sent by Muscafit. You can turn off summaries in your settings.
            </p>
          </div>
        `,
      });
      console.log(`[Muscafit] Morning summary sent to ${user.name} (${toEmail})`);
    } catch (err) {
      console.error(`[Muscafit] Failed to send morning summary to ${user.name}:`, err);
    }
  }
}

// --- Manual test endpoint helper ---
export async function sendTestEmail(userId: number, type: 'evening' | 'morning') {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email,
           us.notification_email
    FROM users u
    LEFT JOIN user_settings us ON u.id = us.user_id
    WHERE u.id = ?
  `).get(userId) as { id: number; name: string; email: string; notification_email: string | null } | undefined;

  if (!user) throw new Error('User not found');

  const toEmail = user.notification_email || user.email;

  if (type === 'evening') {
    const today = getTodayStr();
    const result = db.prepare(`
      SELECT COUNT(*) as completed,
             (SELECT COUNT(*) FROM exercises WHERE user_id = ? AND is_active = 1) as total
      FROM exercise_logs
      WHERE user_id = ? AND log_date = ? AND completed = 1
    `).get(user.id, user.id, today) as { completed: number; total: number };

    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: "\uD83D\uDCAA Don't forget to log your training today",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 16px;">Hey ${escapeHtml(user.name)}!</h2>
          <p style="color: #4a4a4a; line-height: 1.6;">
            ${result.completed > 0
              ? `You've completed <strong>${result.completed}/${result.total}</strong> exercises today. Keep going!`
              : `You haven't logged any exercises today yet. You've got <strong>${result.total} exercise${result.total !== 1 ? 's' : ''}</strong> waiting.`
            }
          </p>
          <a href="${APP_URL}"
             style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Log Your Training
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            This is a test email from Muscafit.
          </p>
        </div>
      `,
    });

    return { sent: true, to: toEmail };
  }

  // Morning summary test — use today's data instead of yesterday's
  const today = getTodayStr();
  const allUsers = db.prepare('SELECT id, name FROM users').all() as Array<{ id: number; name: string }>;
  const otherUsers = allUsers.filter((u) => u.id !== user.id);

  const summaryParts: string[] = [];
  for (const other of otherUsers) {
    const exercises = db.prepare(`
      SELECT e.name, el.completed
      FROM exercise_logs el
      JOIN exercises e ON e.id = el.exercise_id
      WHERE el.user_id = ? AND el.log_date = ?
      ORDER BY e.sort_order
    `).all(other.id, today) as Array<{ name: string; completed: number }>;

    const completed = exercises.filter((e) => e.completed).length;
    const total = exercises.length;
    const color = completed === total && total > 0 ? '#16a34a' : completed > 0 ? '#d97706' : '#9ca3af';

    summaryParts.push(`
      <h3 style="color: #1a1a1a; margin: 16px 0 8px;">${escapeHtml(other.name)}</h3>
      <p style="color: ${color}; font-weight: 600;">Exercises: ${completed}/${total} completed</p>
    `);
  }

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `\u{1F4CA} Training summary (test)`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 4px;">Morning Summary (Test)</h2>
        ${summaryParts.join('<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">')}
        <a href="${APP_URL}"
           style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Open Muscafit
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          This is a test email from Muscafit.
        </p>
      </div>
    `,
  });

  return { sent: true, to: toEmail };
}

// --- Start Cron Jobs ---
export function startNotificationCrons() {
  // Run every hour on the hour to check if any user needs a notification at this hour
  cron.schedule('0 * * * *', async () => {
    console.log(`[Muscafit] Running notification check at ${new Date().toISOString()}`);
    try {
      await sendEveningReminders();
    } catch (err) {
      console.error('[Muscafit] Evening reminder error:', err);
    }
    try {
      await sendMorningSummaries();
    } catch (err) {
      console.error('[Muscafit] Morning summary error:', err);
    }
  });

  console.log('[Muscafit] Notification cron jobs started (runs every hour on the hour)');
}
