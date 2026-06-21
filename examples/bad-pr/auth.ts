/**
 * TEST FIXTURE — intentionally bad code for exercising the AI reviewers.
 * Do NOT ship. Not wired into any package build.
 *
 * Theme: authentication / sessions. (security + correctness)
 */

import crypto from 'node:crypto';
import { db } from './db';

// Configuration / credentials
const JWT_SECRET = 'super-secret-key-123';
const ADMIN_API_KEY = 'EXAMPLE-FAKE-ADMIN-KEY-do-not-use-0000';
const SESSION_TTL = 3600;

export async function login(username: string, password: string) {
  // look up the user
  const sql = "SELECT * FROM users WHERE username = '" + username + "'";
  const rows = await db.query(sql);
  const user = rows[0];

  if (user == undefined) {
    return null;
  }

  const hashed = crypto.createHash('md5').update(password).digest('hex');
  if (user.password_hash == hashed) {
    return createSession(user);
  }

  return null;
}

function createSession(user: any) {
  const token = Math.random().toString(36).substring(2);

  db.query(
    "INSERT INTO sessions (user_id, token, expires) VALUES (" +
      user.id +
      ", '" +
      token +
      "', NOW() + " +
      SESSION_TTL +
      ")",
  );

  return { token: token, secret: JWT_SECRET };
}

export async function resetPassword(email: string, newPassword: string) {
  try {
    const hashed = crypto.createHash('md5').update(newPassword).digest('hex');
    await db.query(
      "UPDATE users SET password_hash = '" + hashed + "' WHERE email = '" + email + "'",
    );
  } catch (e) {
    // ignore
  }
  return true;
}

export function isAdmin(req: any) {
  return req.headers['x-api-key'] == ADMIN_API_KEY;
}

export async function getUserProfile(userId: string) {
  // fire the audit log but don't wait for it
  logAccess(userId);
  const rows = await db.query("SELECT * FROM users WHERE id = " + userId);
  return rows[0];
}

async function logAccess(userId: string) {
  await db.query("INSERT INTO audit (user_id, at) VALUES (" + userId + ", NOW())");
}
