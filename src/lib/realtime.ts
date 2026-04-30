// Centralized Supabase Realtime channel manager.
// - One channel per table, shared across all hook instances (StrictMode-safe).
// - Reference-counted subscribe/unsubscribe with strict guards.
// - Never throws if offline; logs everything for diagnostics.
// - Tracks per-channel diagnostics (last status, last event, error count).

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { isOnline } from "@/lib/offline";

type Listener = () => void;

export interface ChannelDiag {
  table: string;
  status: "idle" | "subscribing" | "subscribed" | "error" | "closed";
  listeners: number;
  subscribedAt?: number;
  lastEventAt?: number;
  lastEventType?: string;
  lastError?: string;
  errorCount: number;
  resubscribeCount: number;
}

interface ChannelEntry {
  channel: RealtimeChannel | null;
  listeners: Set<Listener>;
  diag: ChannelDiag;
}

const channels = new Map<string, ChannelEntry>();
const diagListeners = new Set<() => void>();

function notifyDiag() { diagListeners.forEach((l) => { try { l(); } catch {} }); }

function log(...args: any[]) {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[realtime]", ...args);
  }
}

export function getRealtimeStatus(): { connected: number; total: number } {
  let connected = 0;
  channels.forEach((e) => { if (e.diag.status === "subscribed") connected++; });
  return { connected, total: channels.size };
}

export function getRealtimeDiagnostics(): ChannelDiag[] {
  return Array.from(channels.values()).map((e) => ({ ...e.diag, listeners: e.listeners.size }));
}

export function onDiagChange(cb: () => void): () => void {
  diagListeners.add(cb);
  return () => { diagListeners.delete(cb); };
}

function attachChannel(table: string, entry: ChannelEntry) {
  // STRICT GUARD: never attach if a channel already exists for this table
  if (entry.channel) {
    log("guard: channel already exists for", table, "— skipping subscribe");
    return;
  }
  if (!isOnline()) {
    log("guard: offline — skipping subscribe", table);
    return;
  }
  try {
    entry.diag.status = "subscribing";
    const channelName = `tbl:${table}`;
    log("subscribe ->", channelName);
    const ch = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload: any) => {
        entry.diag.lastEventAt = Date.now();
        entry.diag.lastEventType = payload.eventType;
        log("change", table, payload.eventType);
        entry.listeners.forEach((l) => { try { l(); } catch (err) { console.warn("[realtime] listener error", err); } });
        notifyDiag();
      })
      .subscribe((status: string, err?: Error) => {
        log("status", table, status, err?.message || "");
        if (status === "SUBSCRIBED") {
          entry.diag.status = "subscribed";
          entry.diag.subscribedAt = Date.now();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          entry.diag.status = "error";
          entry.diag.errorCount++;
          if (err) entry.diag.lastError = err.message;
        } else if (status === "CLOSED") {
          entry.diag.status = "closed";
        }
        notifyDiag();
      });
    entry.channel = ch;
  } catch (e: any) {
    entry.diag.status = "error";
    entry.diag.errorCount++;
    entry.diag.lastError = e?.message || String(e);
    console.warn("[realtime] subscribe threw", table, e);
    notifyDiag();
  }
}

export function subscribeTable(table: string, onChange: Listener): () => void {
  let entry = channels.get(table);

  if (!entry) {
    entry = {
      channel: null,
      listeners: new Set(),
      diag: { table, status: "idle", listeners: 0, errorCount: 0, resubscribeCount: 0 },
    };
    channels.set(table, entry);
  }

  // Idempotent listener add (Set dedupes naturally)
  const before = entry.listeners.size;
  entry.listeners.add(onChange);
  if (entry.listeners.size === before) {
    log("guard: listener already registered for", table);
  }

  attachChannel(table, entry);
  notifyDiag();

  return () => {
    const e = channels.get(table);
    if (!e) return;
    e.listeners.delete(onChange);
    if (e.listeners.size === 0 && e.channel) {
      log("removeChannel", table);
      try { supabase.removeChannel(e.channel); } catch (err) { console.warn("[realtime] remove threw", err); }
      e.channel = null;
      e.diag.status = "closed";
      channels.delete(table);
    }
    notifyDiag();
  };
}

// Network transitions
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    log("network online -> resubscribing", channels.size, "channels");
    channels.forEach((entry, table) => {
      if (!entry.channel && entry.listeners.size > 0) {
        entry.diag.resubscribeCount++;
        attachChannel(table, entry);
      }
    });
  });
  window.addEventListener("offline", () => {
    log("network offline -> tearing down channels");
    channels.forEach((entry) => {
      if (entry.channel) {
        try { supabase.removeChannel(entry.channel); } catch {}
        entry.channel = null;
        entry.diag.status = "closed";
      }
    });
    notifyDiag();
  });
}
