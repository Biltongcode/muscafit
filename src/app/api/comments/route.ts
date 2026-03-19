import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { getVisibleUserIds, inPlaceholders } from '@/lib/connections';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.NOTIFICATION_FROM || 'Muscafit <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL || 'https://train.biltongcodes.com';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
  }

  const sessionUserId = Number(session.user.id);
  const visibleIds = getVisibleUserIds(sessionUserId);

  const targetUserId = req.nextUrl.searchParams.get('target_user_id');

  let comments;
  if (targetUserId) {
    comments = db
      .prepare(
        `SELECT c.id, c.author_id as authorId, c.target_user_id as targetUserId,
                c.comment_date as commentDate, c.body, c.created_at as createdAt,
                u.name as authorName,
                u.avatar_url as authorAvatarUrl
         FROM comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.comment_date = ? AND c.target_user_id = ?
           AND c.target_user_id IN ${inPlaceholders(visibleIds)}
           AND c.author_id IN ${inPlaceholders(visibleIds)}
         ORDER BY c.created_at ASC`
      )
      .all(date, Number(targetUserId), ...visibleIds, ...visibleIds);
  } else {
    comments = db
      .prepare(
        `SELECT c.id, c.author_id as authorId, c.target_user_id as targetUserId,
                c.comment_date as commentDate, c.body, c.created_at as createdAt,
                u.name as authorName,
                u.avatar_url as authorAvatarUrl
         FROM comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.comment_date = ?
           AND c.target_user_id IN ${inPlaceholders(visibleIds)}
           AND c.author_id IN ${inPlaceholders(visibleIds)}
         ORDER BY c.created_at ASC`
      )
      .all(date, ...visibleIds, ...visibleIds);
  }

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { targetUserId, date, comment } = body;

  if (!targetUserId || !date || !comment?.trim()) {
    return NextResponse.json({ error: 'targetUserId, date, and comment are required' }, { status: 400 });
  }

  const authorId = Number(session.user.id);
  const visibleIds = getVisibleUserIds(authorId);

  if (!visibleIds.includes(Number(targetUserId))) {
    return NextResponse.json({ error: 'Cannot comment on unconnected user' }, { status: 403 });
  }

  const result = db
    .prepare(
      `INSERT INTO comments (author_id, target_user_id, comment_date, body)
       VALUES (?, ?, ?, ?)`
    )
    .run(authorId, targetUserId, date, comment.trim());

  const created = db
    .prepare(
      `SELECT c.id, c.author_id as authorId, c.target_user_id as targetUserId,
              c.comment_date as commentDate, c.body, c.created_at as createdAt,
              u.name as authorName
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.id = ?`
    )
    .get(result.lastInsertRowid);

  // Send email notification to the target user (don't notify yourself)
  if (Number(targetUserId) !== authorId) {
    const targetUser = db.prepare(
      `SELECT u.name, u.email, us.notification_email, us.notifications_enabled
       FROM users u LEFT JOIN user_settings us ON us.user_id = u.id
       WHERE u.id = ?`
    ).get(Number(targetUserId)) as {
      name: string; email: string; notification_email: string | null; notifications_enabled: number | null;
    } | undefined;

    const authorName = (created as { authorName: string })?.authorName || 'Someone';

    if (targetUser && targetUser.notifications_enabled !== 0) {
      const toEmail = targetUser.notification_email || targetUser.email;
      const dateObj = new Date(date + 'T12:00:00');
      const dateFormatted = dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      const dailyUrl = `${APP_URL}/daily?date=${date}`;

      resend.emails.send({
        from: FROM,
        to: toEmail,
        subject: `${authorName} commented on your day`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #06b6d4, #8b5cf6); padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; color: white;">New Comment</h1>
            </div>
            <div style="padding: 24px;">
              <p style="font-size: 14px; color: #94a3b8; margin-bottom: 4px;">${escapeHtml(dateFormatted)}</p>
              <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #06b6d4;">
                <p style="margin: 0 0 8px; font-size: 14px; font-weight: bold; color: #06b6d4;">${escapeHtml(authorName)}</p>
                <p style="margin: 0; font-size: 16px; color: #e2e8f0;">${escapeHtml(comment.trim())}</p>
              </div>
              <div style="text-align: center;">
                <a href="${dailyUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: white; text-decoration: none; padding: 10px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">View in Muscafit</a>
              </div>
            </div>
          </div>
        `,
      }).catch(err => {
        console.error('[Muscafit] Failed to send comment notification:', err);
      });
    }
  }

  return NextResponse.json({ comment: created }, { status: 201 });
}
