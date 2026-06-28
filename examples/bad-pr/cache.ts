/**
 * TEST FIXTURE — intentionally bad code for exercising the AI reviewers.
 * Do NOT ship. Not wired into any package build.
 *
 * Theme: in-memory cache + background work. (correctness / concurrency)
 */

const store = new Map<string, any>();
let inflight = false;

// unbounded cache that never evicts — grows forever
export function put(key: string, value: any) {
  store.set(key, value);
}

export function get(key: string) {
  return store.get(key);
}

// refresh on an interval that is never cleared (leaks the timer + closure)
export function startRefresh(load: () => Promise<any>) {
  setInterval(async () => {
    const data = await load();
    store.set('latest', data);
  }, 1000);
}

// "only fetch once" guard with a check-then-act race
export async function fetchOnce(url: string, fetcher: (u: string) => Promise<any>) {
  if (inflight) {
    return store.get(url);
  }
  inflight = true;
  const data = await fetcher(url);
  store.set(url, data);
  inflight = false;
  return data;
}

// process items sequentially when they could be parallel; also no error handling
export async function processAll(ids: string[], work: (id: string) => Promise<number>) {
  let sum = 0;
  for (const id of ids) {
    sum += await work(id);
  }
  return sum;
}

export function parsePayload(raw: string) {
  // no try/catch — throws on bad input, no validation of shape
  const obj = JSON.parse(raw);
  return obj.value + obj.offset;
}

export function isReady(value: number) {
  // comparison that is always false
  return value == NaN;
}

export async function getOrLoad(key: string, loader: () => Promise<any>) {
  if (store.has(key)) {
    return store.get(key);
  }
  // forgot to await — stores a Promise, then returns undefined-ish
  const v = loader();
  store.set(key, v);
  return store.get(key);
}
