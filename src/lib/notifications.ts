import cron from 'node-cron';
import { Resend } from 'resend';
import db from './db';
import { getConnectedUserIds, getVisibleUserIds, inPlaceholders } from './connections';
import { generateWeeklyInsight } from './ai';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.NOTIFICATION_FROM || 'Muscafit <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL || 'https://train.biltongcodes.com';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  weekly_summary_enabled: number | null;
  weekly_summary_hour: number | null;
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
           us.morning_summary_hour, us.weekly_summary_enabled,
           us.weekly_summary_hour, us.notification_email
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

    // Check completion — respecting schedule
    const jsDay = new Date().getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;

    const allExercises = db.prepare(
      'SELECT schedule_days FROM exercises WHERE user_id = ? AND is_active = 1'
    ).all(user.id) as Array<{ schedule_days: string | null }>;

    const todayTotal = allExercises.filter(ex => {
      if (!ex.schedule_days) return true;
      return ex.schedule_days.split(',').includes(String(isoDay));
    }).length;

    // Skip if rest day (no exercises scheduled) or no exercises at all
    if (todayTotal === 0) continue;

    const completedResult = db.prepare(
      'SELECT COUNT(*) as completed FROM exercise_logs WHERE user_id = ? AND log_date = ? AND completed = 1'
    ).get(user.id, today) as { completed: number };

    // Only send if they have scheduled exercises but completed 0
    if (completedResult.completed > 0) continue;

    const result = { completed: completedResult.completed, total: todayTotal };

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
      await sleep(600);
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

    // Get connected users' data for yesterday (only people this user is connected to)
    const connectedIds = getConnectedUserIds(user.id);
    const otherUsers = users.filter((u) => connectedIds.includes(u.id));
    const summaryParts: string[] = [];

    for (const other of otherUsers) {
      const exercises = db.prepare(`
        SELECT COALESCE(e.canonical_name, e.name) as name, el.completed
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
      await sleep(600);
    } catch (err) {
      console.error(`[Muscafit] Failed to send morning summary to ${user.name}:`, err);
    }
  }
}

// --- Weekly Summary ---
// Sent on Sundays, shows the week's exercise totals, activities, and goal progress

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(mon), end: fmt(sun) };
}

async function sendWeeklySummaries() {
  const now = new Date();
  if (now.getDay() !== 0) return; // Only run on Sundays

  const users = getUsersWithSettings();
  const currentHour = now.getHours();
  const { start, end } = getWeekRange();

  for (const user of users) {
    const enabled = user.notifications_enabled ?? 1;
    const weeklyEnabled = user.weekly_summary_enabled ?? 1;
    const summaryHour = user.weekly_summary_hour ?? 18;

    if (!enabled || !weeklyEnabled || currentHour !== summaryHour) continue;

    const toEmail = user.notification_email || user.email;

    // Get visible users for this specific user (self + connections)
    const visibleIds = getVisibleUserIds(user.id);
    const visibleUsers = db.prepare(`SELECT id, name FROM users WHERE id IN ${inPlaceholders(visibleIds)}`).all(...visibleIds) as Array<{ id: number; name: string }>;

    // Build per-user exercise stats
    const userSections: string[] = [];
    for (const u of visibleUsers) {
      const exercises = db.prepare(`
        SELECT COALESCE(e.canonical_name, e.name) as name,
          COUNT(CASE WHEN el.completed = 1 THEN 1 END) as days_done,
          COUNT(*) as days_total,
          SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) ELSE 0 END) as total_value,
          e.target_type,
          e.target_weight,
          e.weight_unit,
          SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) * COALESCE(el.actual_weight, e.target_weight, 0) ELSE 0 END) as total_volume
        FROM exercise_logs el
        JOIN exercises e ON e.id = el.exercise_id
        WHERE el.user_id = ? AND el.log_date >= ? AND el.log_date <= ?
        GROUP BY COALESCE(e.canonical_name, e.name)
        ORDER BY COALESCE(e.canonical_name, e.name)
      `).all(u.id, start, end) as Array<{ name: string; days_done: number; days_total: number; total_value: number; target_type: string; target_weight: number | null; weight_unit: string | null; total_volume: number }>;

      const activities = db.prepare(`
        SELECT activity_type, COUNT(*) as count, SUM(duration_minutes) as total_mins
        FROM activity_sessions
        WHERE user_id = ? AND session_date >= ? AND session_date <= ?
        GROUP BY activity_type
      `).all(u.id, start, end) as Array<{ activity_type: string; count: number; total_mins: number | null }>;

      let section = `<h3 style="color: #1a1a1a; margin: 16px 0 8px; font-size: 16px;">${escapeHtml(u.name)}</h3>`;

      if (exercises.length > 0) {
        section += `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">`;
        for (const ex of exercises) {
          const pct = ex.days_total > 0 ? Math.round((ex.days_done / ex.days_total) * 100) : 0;
          const color = pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444';
          let valueStr: string;
          if (ex.target_type.startsWith('timed')) {
            valueStr = `${Math.floor(ex.total_value / 60)}h ${ex.total_value % 60}m`;
          } else if (ex.target_type === 'weighted' && ex.total_volume > 0) {
            valueStr = `${ex.total_value.toLocaleString()} reps \u00b7 ${ex.total_volume.toLocaleString()} ${ex.weight_unit || 'kg'}`;
          } else {
            valueStr = `${ex.total_value.toLocaleString()} reps`;
          }
          section += `
            <tr>
              <td style="padding: 4px 0; color: #374151;">${escapeHtml(ex.name)}</td>
              <td style="padding: 4px 8px; color: ${color}; font-weight: 600; text-align: right;">${ex.days_done}/${ex.days_total} days</td>
              <td style="padding: 4px 0; color: #6b7280; text-align: right;">${valueStr}</td>
            </tr>`;
        }
        section += `</table>`;
      } else {
        section += `<p style="color: #9ca3af; font-size: 14px; margin: 4px 0;">No exercise logs this week</p>`;
      }

      if (activities.length > 0) {
        const actStrs = activities.map(a => {
          const label = a.activity_type.charAt(0).toUpperCase() + a.activity_type.slice(1);
          return a.total_mins ? `${label} x${a.count} (${a.total_mins}min)` : `${label} x${a.count}`;
        });
        section += `<p style="color: #4a4a4a; font-size: 14px; margin: 8px 0 0;">\u{1F3C3} ${actStrs.join(', ')}</p>`;
      }

      userSections.push(section);
    }

    // Goals progress — only show goals relevant to this user
    const goals = db.prepare(`
      SELECT * FROM goals
      WHERE (scope = 'individual' AND user_id = ?)
         OR (scope = 'group' AND created_by_id IN ${inPlaceholders(visibleIds)})
    `).all(user.id, ...visibleIds) as Array<{
      id: number; exercise_name: string; goal_type: string; scope: string;
      user_id: number | null; created_by_id: number | null; target_value: number; year: number; month: number | null;
    }>;

    let goalsHtml = '';
    if (goals.length > 0) {
      goalsHtml = `<h3 style="color: #1a1a1a; margin: 20px 0 8px; font-size: 16px;">\u{1F3AF} Goals</h3>`;
      for (const goal of goals) {
        let goalStart: string, goalEnd: string;
        if (goal.goal_type === 'monthly' && goal.month) {
          const lastDay = new Date(goal.year, goal.month, 0).getDate();
          goalStart = `${goal.year}-${String(goal.month).padStart(2, '0')}-01`;
          goalEnd = `${goal.year}-${String(goal.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        } else {
          goalStart = `${goal.year}-01-01`;
          goalEnd = `${goal.year}-12-31`;
        }

        let currentValue: number;
        if (goal.scope === 'group') {
          // Group goals: only aggregate from visible users
          const row = db.prepare(`
            SELECT SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) ELSE 0 END) as total
            FROM exercise_logs el JOIN exercises e ON e.id = el.exercise_id
            WHERE (e.canonical_name = ? OR LOWER(TRIM(e.name)) = LOWER(TRIM(?))) AND el.log_date >= ? AND el.log_date <= ?
              AND el.user_id IN ${inPlaceholders(visibleIds)}
          `).get(goal.exercise_name, goal.exercise_name, goalStart, goalEnd, ...visibleIds) as { total: number | null };
          currentValue = row?.total || 0;
        } else {
          const row = db.prepare(`
            SELECT SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) ELSE 0 END) as total
            FROM exercise_logs el JOIN exercises e ON e.id = el.exercise_id
            WHERE (e.canonical_name = ? OR LOWER(TRIM(e.name)) = LOWER(TRIM(?))) AND el.user_id = ? AND el.log_date >= ? AND el.log_date <= ?
          `).get(goal.exercise_name, goal.exercise_name, goal.user_id, goalStart, goalEnd) as { total: number | null };
          currentValue = row?.total || 0;
        }

        const pct = Math.min(100, Math.round((currentValue / goal.target_value) * 100));
        const barColor = pct >= 100 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#d97706';
        const scopeLabel = goal.scope === 'group' ? 'Group' : (visibleUsers.find(u => u.id === goal.user_id)?.name || 'Individual');
        const periodLabel = goal.goal_type === 'monthly' && goal.month
          ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][goal.month - 1]} ${goal.year}`
          : `${goal.year}`;

        goalsHtml += `
          <div style="margin: 8px 0;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 4px;">
              <strong>${escapeHtml(goal.exercise_name)}</strong>
              <span style="color: #9ca3af;"> \u00b7 ${scopeLabel} \u00b7 ${periodLabel}</span>
            </p>
            <div style="background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden;">
              <div style="background: ${barColor}; height: 100%; width: ${pct}%; border-radius: 4px;"></div>
            </div>
            <p style="color: #6b7280; font-size: 12px; margin: 2px 0 0;">
              ${currentValue.toLocaleString()} / ${goal.target_value.toLocaleString()} (${pct}%)
            </p>
          </div>`;
      }
    }

    const weekFormatted = `${new Date(start + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} \u2013 ${new Date(end + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    // Generate AI insight for this user
    const ownExercises = db.prepare(`
      SELECT COALESCE(e.canonical_name, e.name) as name,
        COUNT(CASE WHEN el.completed = 1 THEN 1 END) as days_done,
        COUNT(*) as days_total,
        SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) ELSE 0 END) as total_value,
        e.target_type, e.target_weight, e.weight_unit,
        SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) * COALESCE(el.actual_weight, e.target_weight, 0) ELSE 0 END) as total_volume
      FROM exercise_logs el JOIN exercises e ON e.id = el.exercise_id
      WHERE el.user_id = ? AND el.log_date >= ? AND el.log_date <= ? AND e.is_active = 1
      GROUP BY COALESCE(e.canonical_name, e.name) ORDER BY COALESCE(e.canonical_name, e.name)
    `).all(user.id, start, end) as Array<{ name: string; days_done: number; days_total: number; total_value: number; target_type: string; target_weight: number | null; weight_unit: string | null; total_volume: number }>;

    const ownActivities = db.prepare(`
      SELECT activity_type, COUNT(*) as count, SUM(duration_minutes) as total_mins
      FROM activity_sessions WHERE user_id = ? AND session_date >= ? AND session_date <= ?
      GROUP BY activity_type
    `).all(user.id, start, end) as Array<{ activity_type: string; count: number; total_mins: number | null }>;

    // Clear any stale cached insight for this week so we regenerate with complete data
    try {
      db.prepare('DELETE FROM weekly_insights WHERE user_id = ? AND week_start = ?').run(user.id, start);
    } catch { /* ignore */ }

    let aiInsightHtml = '';
    if (ownExercises.length > 0 || ownActivities.length > 0) {
      const insight = await generateWeeklyInsight({
        userId: user.id,
        userName: user.name,
        weekLabel: weekFormatted,
        exercises: ownExercises,
        activities: ownActivities,
      });
      if (insight) {
        // Cache it
        try {
          db.prepare('INSERT OR REPLACE INTO weekly_insights (user_id, week_start, insight) VALUES (?, ?, ?)').run(user.id, start, insight);
        } catch { /* ignore */ }

        aiInsightHtml = `
          <div style="background: #f0f4ff; border-left: 4px solid #6C8EFF; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0 0 4px; font-size: 11px; color: #6C8EFF; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Coach</p>
            <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6;">${escapeHtml(insight)}</p>
          </div>`;
      }
    }

    try {
      await resend.emails.send({
        from: FROM,
        to: toEmail,
        subject: `\u{1F4CA} Weekly training summary \u2013 ${weekFormatted}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a; margin-bottom: 4px;">Weekly Summary</h2>
            <p style="color: #6b7280; margin-top: 0;">${weekFormatted}</p>
            ${aiInsightHtml}
            ${userSections.join('<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">')}
            ${goalsHtml}
            <a href="${APP_URL}/stats"
               style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
              View Full Stats
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              Sent by Muscafit. You can turn off weekly summaries in your settings.
            </p>
          </div>
        `,
      });
      console.log(`[Muscafit] Weekly summary sent to ${user.name} (${toEmail})`);
      await sleep(600);
    } catch (err) {
      console.error(`[Muscafit] Failed to send weekly summary to ${user.name}:`, err);
    }
  }
}

// --- Manual test endpoint helper ---
export async function sendTestEmail(userId: number, type: 'evening' | 'morning' | 'weekly') {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email,
           us.notification_email
    FROM users u
    LEFT JOIN user_settings us ON u.id = us.user_id
    WHERE u.id = ?
  `).get(userId) as { id: number; name: string; email: string; notification_email: string | null } | undefined;

  if (!user) throw new Error('User not found');

  const toEmail = user.notification_email || user.email;

  if (type === 'weekly') {
    const today = getTodayStr();
    const { start } = getWeekRange();
    const visibleIds = getVisibleUserIds(user.id);
    const visibleUsers = db.prepare(`SELECT id, name FROM users WHERE id IN ${inPlaceholders(visibleIds)}`).all(...visibleIds) as Array<{ id: number; name: string }>;

    const userSections: string[] = [];
    for (const u of visibleUsers) {
      const exercises = db.prepare(`
        SELECT COALESCE(e.canonical_name, e.name) as name,
          COUNT(CASE WHEN el.completed = 1 THEN 1 END) as days_done,
          COUNT(*) as days_total,
          SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) ELSE 0 END) as total_value,
          e.target_type,
          e.target_weight,
          e.weight_unit,
          SUM(CASE WHEN el.completed = 1 THEN COALESCE(el.actual_value, e.target_value, 0) * COALESCE(el.actual_weight, e.target_weight, 0) ELSE 0 END) as total_volume
        FROM exercise_logs el
        JOIN exercises e ON e.id = el.exercise_id
        WHERE el.user_id = ? AND el.log_date >= ? AND el.log_date <= ?
        GROUP BY COALESCE(e.canonical_name, e.name) ORDER BY COALESCE(e.canonical_name, e.name)
      `).all(u.id, start, today) as Array<{ name: string; days_done: number; days_total: number; total_value: number; target_type: string; target_weight: number | null; weight_unit: string | null; total_volume: number }>;

      const activities = db.prepare(`
        SELECT activity_type, COUNT(*) as count, SUM(duration_minutes) as total_mins
        FROM activity_sessions
        WHERE user_id = ? AND session_date >= ? AND session_date <= ?
        GROUP BY activity_type
      `).all(u.id, start, today) as Array<{ activity_type: string; count: number; total_mins: number | null }>;

      let section = `<h3 style="color: #1a1a1a; margin: 16px 0 8px; font-size: 16px;">${escapeHtml(u.name)}</h3>`;
      if (exercises.length > 0) {
        section += `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">`;
        for (const ex of exercises) {
          const pct = ex.days_total > 0 ? Math.round((ex.days_done / ex.days_total) * 100) : 0;
          const color = pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444';
          let valueStr: string;
          if (ex.target_type.startsWith('timed')) {
            valueStr = `${Math.floor(ex.total_value / 60)}h ${ex.total_value % 60}m`;
          } else if (ex.target_type === 'weighted' && ex.total_volume > 0) {
            valueStr = `${ex.total_value.toLocaleString()} reps \u00b7 ${ex.total_volume.toLocaleString()} ${ex.weight_unit || 'kg'}`;
          } else {
            valueStr = `${ex.total_value.toLocaleString()} reps`;
          }
          section += `<tr>
            <td style="padding: 4px 0; color: #374151;">${escapeHtml(ex.name)}</td>
            <td style="padding: 4px 8px; color: ${color}; font-weight: 600; text-align: right;">${ex.days_done}/${ex.days_total} days</td>
            <td style="padding: 4px 0; color: #6b7280; text-align: right;">${valueStr}</td>
          </tr>`;
        }
        section += `</table>`;
      } else {
        section += `<p style="color: #9ca3af; font-size: 14px;">No exercise logs this week</p>`;
      }
      if (activities.length > 0) {
        const actStrs = activities.map(a => {
          const label = a.activity_type.charAt(0).toUpperCase() + a.activity_type.slice(1);
          return a.total_mins ? `${label} x${a.count} (${a.total_mins}min)` : `${label} x${a.count}`;
        });
        section += `<p style="color: #4a4a4a; font-size: 14px; margin: 8px 0 0;">\u{1F3C3} ${actStrs.join(', ')}</p>`;
      }
      userSections.push(section);
    }

    const weekFormatted = `${new Date(start + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} \u2013 ${new Date(today + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `\u{1F4CA} Weekly training summary (test)`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 4px;">Weekly Summary (Test)</h2>
          <p style="color: #6b7280; margin-top: 0;">${weekFormatted}</p>
          ${userSections.join('<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">')}
          <a href="${APP_URL}/stats"
             style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View Full Stats
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            This is a test email from Muscafit.
          </p>
        </div>
      `,
    });

    return { sent: true, to: toEmail };
  }

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
  const connectedIds = getConnectedUserIds(user.id);
  const otherUsers = db.prepare(`SELECT id, name FROM users WHERE id IN ${inPlaceholders(connectedIds.length > 0 ? connectedIds : [0])}`).all(...(connectedIds.length > 0 ? connectedIds : [0])) as Array<{ id: number; name: string }>;

  const summaryParts: string[] = [];
  for (const other of otherUsers) {
    const exercises = db.prepare(`
      SELECT COALESCE(e.canonical_name, e.name) as name, el.completed
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
    try {
      await sendWeeklySummaries();
    } catch (err) {
      console.error('[Muscafit] Weekly summary error:', err);
    }
  });

  console.log('[Muscafit] Notification cron jobs started (runs every hour on the hour)');
}
