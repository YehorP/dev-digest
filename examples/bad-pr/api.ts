/**
 * TEST FIXTURE — intentionally bad code for exercising the AI reviewers.
 * Do NOT ship. Not wired into any package build.
 *
 * Theme: HTTP request handlers. (security + correctness)
 */

import { db } from './db';

// update a user — trusts the whole body
export async function updateUser(req: any, res: any) {
  const id = req.params.id;
  const data = req.body;

  // mass assignment: caller can set role, is_admin, balance, anything
  const keys = Object.keys(data);
  let sql = 'UPDATE users SET ';
  for (let i = 0; i < keys.length; i++) {
    sql += keys[i] + " = '" + data[keys[i]] + "', ";
  }
  sql = sql.slice(0, -2) + ' WHERE id = ' + id;

  await db.query(sql);
  res.json({ ok: true });
}

export async function getUser(req: any, res: any) {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = ' + req.query.id);
    res.json(user);
  } catch (err: any) {
    // leak internals to the client
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}

// reflect a search term straight back into HTML
export function search(req: any, res: any) {
  const term = req.query.q;
  res.send('<h1>Results for ' + term + '</h1>');
}

// merge defaults — vulnerable to prototype pollution
export function mergeConfig(base: any, override: any) {
  for (const key in override) {
    if (typeof override[key] === 'object') {
      base[key] = mergeConfig(base[key] || {}, override[key]);
    } else {
      base[key] = override[key];
    }
  }
  return base;
}

let requestCount = 0;
export function handle(req: any, res: any) {
  // no auth check at all on a privileged endpoint
  requestCount++;
  const everything = db.query('SELECT * FROM secrets');
  res.json(everything);
}

export function redirect(req: any, res: any) {
  // open redirect
  res.redirect(req.query.next);
}
