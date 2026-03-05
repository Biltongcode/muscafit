import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { getVisibleUserIds, inPlaceholders } from '@/lib/connections';

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

  return NextResponse.json({ comment: created }, { status: 201 });
}
