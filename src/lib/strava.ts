import crypto from 'crypto';
import db from './db';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID || '';
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || '';
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// --- Token Management ---

interface StravaTokenRow {
  user_id: number;
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export async function getValidToken(userId: number): Promise<string | null> {
  const row = db.prepare('SELECT * FROM strava_tokens WHERE user_id = ?').get(userId) as StravaTokenRow | undefined;
  if (!row) return null;

  const now = Math.floor(Date.now() / 1000);
  if (now < row.expires_at - 300) {
    return row.access_token;
  }

  // Token expired or about to expire — refresh
  try {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: row.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.error('[Strava] Token refresh failed:', res.status);
      return row.access_token; // fallback to old token
    }

    const data = await res.json();
    db.prepare(`
      UPDATE strava_tokens
      SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(data.access_token, data.refresh_token, data.expires_at, userId);

    return data.access_token;
  } catch (err) {
    console.error('[Strava] Token refresh error:', err);
    return row.access_token;
  }
}

// --- Activity Sync ---

interface StravaApiActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date_local: string;
}

export async function syncUserActivities(userId: number): Promise<void> {
  // Check cooldown
  const syncLog = db.prepare('SELECT synced_at FROM strava_sync_log WHERE user_id = ?').get(userId) as { synced_at: string } | undefined;
  if (syncLog) {
    const lastSync = new Date(syncLog.synced_at + 'Z').getTime();
    if (Date.now() - lastSync < SYNC_COOLDOWN_MS) return;
  }

  const token = await getValidToken(userId);
  if (!token) return;

  try {
    // Fetch last 30 days of activities
    const after = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      console.error('[Strava] Fetch activities failed:', res.status);
      return;
    }

    const activities: StravaApiActivity[] = await res.json();

    const upsert = db.prepare(`
      INSERT OR REPLACE INTO strava_activities
        (strava_id, user_id, name, sport_type, distance_meters, moving_time_seconds,
         total_elevation_gain, start_date_local, activity_date, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const upsertMany = db.transaction((items: StravaApiActivity[]) => {
      for (const a of items) {
        const activityDate = a.start_date_local.slice(0, 10); // YYYY-MM-DD
        upsert.run(
          a.id, userId, a.name, a.sport_type || a.type,
          a.distance, a.moving_time, a.total_elevation_gain,
          a.start_date_local, activityDate
        );
      }
    });

    upsertMany(activities);

    // Update sync log
    db.prepare(`
      INSERT OR REPLACE INTO strava_sync_log (user_id, synced_at, activities_fetched)
      VALUES (?, CURRENT_TIMESTAMP, ?)
    `).run(userId, activities.length);

  } catch (err) {
    console.error('[Strava] Sync error:', err);
  }
}

// --- Query Cached Activities ---

export interface CachedStravaActivity {
  stravaId: number;
  userId: number;
  name: string;
  sportType: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  totalElevationGain: number;
  startDateLocal: string;
  activityDate: string;
}

function mapRow(row: Record<string, unknown>): CachedStravaActivity {
  return {
    stravaId: row.strava_id as number,
    userId: row.user_id as number,
    name: row.name as string,
    sportType: row.sport_type as string,
    distanceMeters: row.distance_meters as number,
    movingTimeSeconds: row.moving_time_seconds as number,
    totalElevationGain: row.total_elevation_gain as number,
    startDateLocal: row.start_date_local as string,
    activityDate: row.activity_date as string,
  };
}

export function getActivitiesForDate(userId: number, date: string): CachedStravaActivity[] {
  const rows = db.prepare(
    'SELECT * FROM strava_activities WHERE user_id = ? AND activity_date = ? ORDER BY start_date_local'
  ).all(userId, date) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export function getActivitiesForRange(startDate: string, endDate: string): CachedStravaActivity[] {
  const rows = db.prepare(
    'SELECT * FROM strava_activities WHERE activity_date BETWEEN ? AND ? ORDER BY start_date_local DESC'
  ).all(startDate, endDate) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export function getConnectedUserIds(): number[] {
  const rows = db.prepare('SELECT user_id FROM strava_tokens').all() as { user_id: number }[];
  return rows.map((r) => r.user_id);
}

// --- OAuth Helpers ---

export function generateOAuthState(userId: number): string {
  const secret = process.env.NEXTAUTH_SECRET || '';
  const hmac = crypto.createHmac('sha256', secret).update(String(userId)).digest('hex');
  return `${userId}.${hmac}`;
}

export function verifyOAuthState(state: string): number | null {
  const [userIdStr, hmac] = state.split('.');
  if (!userIdStr || !hmac) return null;
  const userId = Number(userIdStr);
  if (isNaN(userId)) return null;
  const secret = process.env.NEXTAUTH_SECRET || '';
  const expected = crypto.createHmac('sha256', secret).update(String(userId)).digest('hex');
  if (hmac !== expected) return null;
  return userId;
}

export function getStravaAuthUrl(userId: number): string {
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3010'}/api/strava/callback`;
  const state = generateOAuthState(userId);
  return `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=activity:read_all&state=${state}&approval_prompt=auto`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: { id: number };
  }>;
}

// --- Formatting Helpers ---

export function formatDistance(meters: number): string {
  if (meters === 0) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
