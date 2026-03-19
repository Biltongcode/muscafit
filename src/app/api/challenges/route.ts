import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.NOTIFICATION_FROM || 'Muscafit <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL || 'https://train.biltongcodes.com';

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// GET: List challenges for current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number(session.user.id);
  const dateParam = req.nextUrl.searchParams.get('date');

  let challenges;
  if (dateParam) {
    // Get challenges for a specific date
    challenges = db.prepare(`
      SELECT c.*,
        challenger.name as challenger_name,
        challenged.name as challenged_name
      FROM challenges c
      JOIN users challenger ON challenger.id = c.challenger_id
      JOIN users challenged ON challenged.id = c.challenged_id
      WHERE (c.challenger_id = ? OR c.challenged_id = ?)
        AND c.challenge_date = ?
      ORDER BY c.created_at DESC
    `).all(userId, userId, dateParam);
  } else {
    // Get all challenges
    challenges = db.prepare(`
      SELECT c.*,
        challenger.name as challenger_name,
        challenged.name as challenged_name
      FROM challenges c
      JOIN users challenger ON challenger.id = c.challenger_id
      JOIN users challenged ON challenged.id = c.challenged_id
      WHERE c.challenger_id = ? OR c.challenged_id = ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `).all(userId, userId);
  }

  return NextResponse.json({ challenges });
}

// POST: Create a new challenge
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number(session.user.id);
  const body = await req.json();
  const {
    challengedId, exerciseName, targetType,
    targetValue, targetSets, targetPerSet,
    targetWeight, weightUnit,
    targetDistance, distanceUnit,
    challengeDate,
  } = body;

  if (!challengedId || !exerciseName || !targetType || !challengeDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (challengedId === userId) {
    return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 });
  }

  // Verify connection exists
  const connection = db.prepare(
    'SELECT id FROM user_connections WHERE user_id = ? AND connected_user_id = ?'
  ).get(userId, challengedId);
  if (!connection) {
    return NextResponse.json({ error: 'You can only challenge connections' }, { status: 400 });
  }

  // Check once-per-week-per-user limit
  const weekKey = getWeekKey(challengeDate);
  const existingThisWeek = db.prepare(
    'SELECT id FROM challenges WHERE challenger_id = ? AND challenged_id = ? AND week_key = ?'
  ).get(userId, challengedId, weekKey);
  if (existingThisWeek) {
    return NextResponse.json({ error: `You've already challenged this user this week` }, { status: 400 });
  }

  // Validate date is today or future (within 7 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const challDate = new Date(challengeDate + 'T12:00:00');
  challDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((challDate.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return NextResponse.json({ error: 'Challenge date must be today or in the future' }, { status: 400 });
  }
  if (diffDays > 7) {
    return NextResponse.json({ error: 'Challenge date must be within 7 days' }, { status: 400 });
  }

  const acceptToken = crypto.randomBytes(32).toString('hex');

  const result = db.prepare(`
    INSERT INTO challenges (
      challenger_id, challenged_id, exercise_name, target_type,
      target_value, target_sets, target_per_set,
      target_weight, weight_unit,
      target_distance, distance_unit,
      challenge_date, status, week_key, accept_token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    userId, challengedId, exerciseName, targetType,
    targetValue || null, targetSets || null, targetPerSet || null,
    targetWeight || null, weightUnit || null,
    targetDistance || null, distanceUnit || null,
    challengeDate, weekKey, acceptToken
  );

  // Send email to challenged user
  const challenger = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string };
  const challenged = db.prepare('SELECT name, email, notification_email FROM users u LEFT JOIN user_settings us ON us.user_id = u.id WHERE u.id = ?')
    .get(challengedId) as { name: string; email: string; notification_email: string | null } | undefined;

  if (challenged) {
    const toEmail = challenged.notification_email || challenged.email;
    const formatTarget = () => {
      if (targetType === 'distance') return `${targetDistance}${distanceUnit === 'm' ? 'm' : ' ' + distanceUnit}`;
      if (targetType === 'weighted') return `${targetSets}x${targetPerSet} @ ${targetWeight}${weightUnit || 'kg'}`;
      if (targetType === 'reps_sets') return `${targetValue} in ${targetSets}x${targetPerSet}`;
      if (targetType.startsWith('timed')) return `${targetValue} seconds`;
      return `${targetValue} reps`;
    };

    const acceptUrl = `${APP_URL}/api/challenges/${result.lastInsertRowid}/accept?token=${acceptToken}`;
    const declineUrl = `${APP_URL}/api/challenges/${result.lastInsertRowid}/decline?token=${acceptToken}`;
    const dateObj = new Date(challengeDate + 'T12:00:00');
    const dateFormatted = dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    try {
      await resend.emails.send({
        from: FROM,
        to: toEmail,
        subject: `${challenger.name} has challenged you!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #06b6d4, #8b5cf6); padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; color: white;">Challenge!</h1>
            </div>
            <div style="padding: 24px;">
              <p style="font-size: 16px; margin-bottom: 16px;">
                <strong>${escapeHtml(challenger.name)}</strong> has challenged you to:
              </p>
              <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #06b6d4;">
                <p style="margin: 0; font-size: 20px; font-weight: bold; color: #06b6d4;">${escapeHtml(exerciseName)}</p>
                <p style="margin: 4px 0 0; font-size: 16px; color: #94a3b8;">Target: ${escapeHtml(formatTarget())}</p>
                <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">On: ${escapeHtml(dateFormatted)}</p>
              </div>
              <p style="font-size: 14px; color: #94a3b8; margin-bottom: 20px;">
                Complete it to earn a beer token. Fail and you get a poop token!
              </p>
              <div style="text-align: center;">
                <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; margin-right: 8px;">Accept Challenge</a>
                <a href="${declineUrl}" style="display: inline-block; background: #334155; color: #94a3b8; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px;">Decline</a>
              </div>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error('[Muscafit] Failed to send challenge email:', err);
    }
  }

  return NextResponse.json({ success: true, challengeId: result.lastInsertRowid });
}
