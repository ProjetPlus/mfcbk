// Tiny generic draft store — persists arbitrary form state to sessionStorage,
// so the page can be reloaded (e.g. by mobile camera capture) without losing input.
const PREFIX = "ck_draft_";

export function loadDraft<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function saveDraft<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn("[draft] save failed", key, e);
  }
}

export function clearDraft(key: string) {
  sessionStorage.removeItem(PREFIX + key);
}
