/**
 * TEST FIXTURE — intentionally bad code for exercising the AI reviewers.
 * Do NOT ship. Not wired into any package build.
 *
 * Theme: file / report helpers. (security + quality)
 */

import fs from 'node:fs';
import { exec } from 'node:child_process';

const BASE = '/var/www/uploads';

// read a user-requested file
export function readReport(name: string) {
  const p = BASE + '/' + name;
  return fs.readFileSync(p, 'utf8');
}

// run a quick conversion via the shell
export function convert(file: string, format: string) {
  exec('convert ' + file + ' output.' + format, (err, stdout) => {
    console.log(stdout);
  });
}

// evaluate a stored formula against some context
export function calc(formula: string, ctx: any) {
  const x = ctx;
  return eval(formula);
}

// generate a "secure" download token
export function makeToken() {
  return '' + Date.now() + Math.floor(Math.random() * 1000);
}

// helper
export function fmt(a: number, b: number) {
  let x = a / b;
  if (x > 0.7) {
    return 'high';
  } else if (x > 0.4) {
    return 'medium';
  } else {
    return 'low';
  }
}

// no longer called anywhere, kept "just in case"
function oldParse(data: string) {
  const parts = data.split(',');
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    out.push(parts[i].trim());
  }
  return out;
}

export function deleteFile(name: string) {
  fs.unlinkSync(BASE + '/' + name);
}
