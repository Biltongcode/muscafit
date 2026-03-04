import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyOAuthState, exchangeCodeForTokens } from '@/lib/strava';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/settings/strava?error=denied', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings/strava?error=missing_params', request.url));
  }

  // Verify state matches the logged-in user
  const stateUserId = verifyOAuthState(state);
  const sessionUserId = Number(session.user.id);

  if (stateUserId !== sessionUserId) {
    return NextResponse.redirect(new URL('/settings/strava?error=invalid_state', request.url));
  }

  try {
    const data = await exchangeCodeForTokens(code);

    db.prepare(`
      INSERT OR REPLACE INTO strava_tokens
        (user_id, strava_athlete_id, access_token, refresh_token, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(sessionUserId, data.athlete.id, data.access_token, data.refresh_token, data.expires_at);

    return NextResponse.redirect(new URL('/settings/strava?connected=true', request.url));
  } catch (err) {
    console.error('[Strava] OAuth callback error:', err);
    return NextResponse.redirect(new URL('/settings/strava?error=exchange_failed', request.url));
  }
}
