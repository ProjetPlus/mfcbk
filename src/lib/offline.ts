// Offline-first cache + sync queue using localStorage.
// All Supabase reads pass through here for instant offline access.

const PREFIX = "ck_cache_";
const QUEUE_KEY = "ck_sync_queue";
const USERS_CACHE = "ck_users_cache";
const SESSION_KEY = "campbethel_user";

export function getCache<T>(table: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + table);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCache<T>(table: string, data: T[]) {
  try {
    localStorage.setItem(PREFIX + table, JSON.stringify(data));
  } catch (e) {
    console.warn("Cache write failed", table, e);
  }
}

export function getCacheSingle<T>(table: string): T | undefined {
  const arr = getCache<T>(table);
  return arr[0];
}

export function setCacheSingle<T>(table: string, item: T) {
  setCache(table, [item]);
}

// ---------- Sync queue for offline mutations ----------
export type QueuedOp = {
  id: string;
  table: string;
  op: "insert" | "update" | "delete";
  payload?: any;
  match?: { column: string; value: any };
  ts: number;
};

export function getQueue(): QueuedOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueue(op: Omit<QueuedOp, "id" | "ts">) {
  const queue = getQueue();
  const payload = op.payload ? normalizeDates(op.payload) : op.payload;
  queue.push({ ...op, payload, id: crypto.randomUUID(), ts: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Normalize date/time fields to ISO UTC strings to avoid timezone drift on sync. */
const DATE_KEY_RE = /(_at|_date|date|_on)$/i;
function normalizeDates(input: any): any {
  if (input == null) return input;
  if (Array.isArray(input)) return input.map(normalizeDates);
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "object") {
    const out: any = {};
    for (const k of Object.keys(input)) {
      const v = input[k];
      if (v instanceof Date) out[k] = v.toISOString();
      else if (typeof v === "string" && DATE_KEY_RE.test(k)) out[k] = normalizeDateString(v) ?? v;
      else if (v && typeof v === "object") out[k] = normalizeDates(v);
      else out[k] = v;
    }
    return out;
  }
  return input;
}
function normalizeDateString(s: string): string | null {
  if (!s) return null;
  // Already ISO datetime
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    return isNaN(+d) ? null : d.toISOString();
  }
  // YYYY-MM-DD → keep as date-only (no TZ shift)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    let yr = parseInt(y); if (yr < 100) yr += 2000;
    const dn = +d, mn = +mo;
    if (mn < 1 || mn > 12 || dn < 1 || dn > 31) return null;
    return `${yr}-${String(mn).padStart(2, "0")}-${String(dn).padStart(2, "0")}`;
  }
  const d = new Date(s);
  return isNaN(+d) ? null : d.toISOString();
}

export function clearQueueItem(id: string) {
  const queue = getQueue().filter((q) => q.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Per-item retry tracking (in-memory + persisted in queue item).
const RETRY_MAX = 8;

export async function flushQueue(supabase: any): Promise<number> {
  if (!isOnline()) return 0;
  const queue = getQueue();
  let flushed = 0;
  const remaining: QueuedOp[] = [];
  for (const item of queue) {
    try {
      if (item.op === "insert") {
        const { error } = await supabase.from(item.table).insert(item.payload);
        if (error) throw error;
      } else if (item.op === "update" && item.match) {
        const { error } = await supabase.from(item.table).update(item.payload).eq(item.match.column, item.match.value);
        if (error) throw error;
      } else if (item.op === "delete" && item.match) {
        const { error } = await supabase.from(item.table).delete().eq(item.match.column, item.match.value);
        if (error) throw error;
      }
      flushed++;
    } catch (e: any) {
      const retries = ((item as any).retries ?? 0) + 1;
      console.warn(`[sync] item failed (retry ${retries}/${RETRY_MAX})`, item.table, item.op, e?.message || e);
      if (retries < RETRY_MAX) {
        remaining.push({ ...item, ...({ retries } as any) });
      } else {
        console.error("[sync] item permanently failed, dropped", item, e);
      }
    }
  }
  // Append any items that haven't been processed yet (none here since we iterate all)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return flushed;
}

/** Auto-retry loop: keep flushing while we're online and items remain. */
let _autoSyncTimer: any = null;
export function startAutoSync(supabase: any, intervalMs = 15000) {
  if (_autoSyncTimer) return;
  const tick = async () => {
    try {
      if (isOnline() && getQueue().length > 0) {
        await flushQueue(supabase);
      }
    } catch (e) { console.warn("[autosync] tick failed", e); }
  };
  _autoSyncTimer = setInterval(tick, intervalMs);
  // Immediate kick on online event, page show, visibility change (returning from camera).
  window.addEventListener("online", () => { setTimeout(tick, 500); });
  window.addEventListener("pageshow", () => { setTimeout(tick, 800); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") setTimeout(tick, 800);
  });
  setTimeout(tick, 1500);
}

/** Aggregate queue stats for the diagnostic widget. */
export function getQueueStats() {
  const q = getQueue();
  const byTable: Record<string, number> = {};
  const byOp: Record<string, number> = { insert: 0, update: 0, delete: 0 };
  let withRetries = 0;
  let oldest: number | null = null;
  for (const it of q) {
    byTable[it.table] = (byTable[it.table] || 0) + 1;
    byOp[it.op] = (byOp[it.op] || 0) + 1;
    if ((it as any).retries) withRetries++;
    if (oldest === null || it.ts < oldest) oldest = it.ts;
  }
  return { total: q.length, byTable, byOp, withRetries, oldest };
}

export function isOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// ---------- Offline auth cache ----------
async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type CachedUser = { user: any; passHash: string };

export async function cacheUserCredentials(username: string, password: string, user: any) {
  const passHash = await sha256(password);
  const all = getUsersCache();
  all[username.toLowerCase()] = { user, passHash };
  localStorage.setItem(USERS_CACHE, JSON.stringify(all));
}

function getUsersCache(): Record<string, CachedUser> {
  try {
    const raw = localStorage.getItem(USERS_CACHE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function authenticateOffline(username: string, password: string): Promise<any | null> {
  const all = getUsersCache();
  const entry = all[username.toLowerCase()];
  if (!entry) return null;
  const passHash = await sha256(password);
  return entry.passHash === passHash ? entry.user : null;
}

export function getOfflineSession(): any | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Seed admin credentials so first-ever login works offline too
export async function seedDefaultAdmin() {
  const all = getUsersCache();
  if (!all["admin"]) {
    await cacheUserCredentials("admin", "12345678", {
      id: "offline-admin",
      username: "admin",
      role: "super_admin",
      display_name: "Administrateur",
      is_active: true,
      password_hash: "",
      created_at: new Date().toISOString(),
    });
  }
}
