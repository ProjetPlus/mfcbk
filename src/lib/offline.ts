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
  queue.push({ ...op, id: crypto.randomUUID(), ts: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueueItem(id: string) {
  const queue = getQueue().filter((q) => q.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue(supabase: any): Promise<number> {
  const queue = getQueue();
  let flushed = 0;
  for (const item of queue) {
    try {
      if (item.op === "insert") {
        await supabase.from(item.table).insert(item.payload);
      } else if (item.op === "update" && item.match) {
        await supabase.from(item.table).update(item.payload).eq(item.match.column, item.match.value);
      } else if (item.op === "delete" && item.match) {
        await supabase.from(item.table).delete().eq(item.match.column, item.match.value);
      }
      clearQueueItem(item.id);
      flushed++;
    } catch (e) {
      console.warn("Sync queue item failed, will retry", item, e);
      break; // stop on failure to preserve order
    }
  }
  return flushed;
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
