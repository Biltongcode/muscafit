import db from './db';

/**
 * Get user IDs that are connected to the given user (NOT including self)
 */
export function getConnectedUserIds(userId: number): number[] {
  const rows = db.prepare(
    'SELECT connected_user_id FROM user_connections WHERE user_id = ?'
  ).all(userId) as Array<{ connected_user_id: number }>;
  return rows.map(r => r.connected_user_id);
}

/**
 * Get all user IDs visible to the given user (self + connections)
 */
export function getVisibleUserIds(userId: number): number[] {
  return [userId, ...getConnectedUserIds(userId)];
}

/**
 * Check if two users are connected
 */
export function areConnected(userId1: number, userId2: number): boolean {
  const row = db.prepare(
    'SELECT 1 FROM user_connections WHERE user_id = ? AND connected_user_id = ?'
  ).get(userId1, userId2);
  return !!row;
}

/**
 * Create a bidirectional connection between two users
 */
export function createConnection(userId1: number, userId2: number): void {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO user_connections (user_id, connected_user_id) VALUES (?, ?)'
  );
  insert.run(userId1, userId2);
  insert.run(userId2, userId1);
}

/**
 * Remove a bidirectional connection between two users
 */
export function removeConnection(userId1: number, userId2: number): void {
  const del = db.prepare(
    'DELETE FROM user_connections WHERE user_id = ? AND connected_user_id = ?'
  );
  del.run(userId1, userId2);
  del.run(userId2, userId1);
}

/**
 * Generate SQL IN placeholder string for an array, e.g. (?, ?, ?)
 */
export function inPlaceholders(arr: number[]): string {
  return `(${arr.map(() => '?').join(', ')})`;
}
