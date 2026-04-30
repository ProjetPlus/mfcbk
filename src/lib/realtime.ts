// Centralized Supabase Realtime channel manager.
// - One channel per table, shared across all hook instances (StrictMode-safe).
// - Reference-counted subscribe/unsubscribe.
// - Never throws if offline; logs everything for diagnostics.

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { isOnline } from "@/lib/offline";

type Listener = () => void;

interface ChannelEntry {
  channel: RealtimeChannel | null;
  listeners: Set<Listener>;
  status: "idle" | "subscribing" | "subscribed" | "error" | "closed";
}

const channels = new Map<string, ChannelEntry>();

function log(...args: any[]) {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[realtime]", ...args);
  }
}

export function getRealtimeStatus(): { connected: number; total: number } {
  let connected = 0;
  channels.forEach((e) => { if (e.status === "subscribed") connected++; });
  return { connected, total: channels.size };
}

export function subscribeTable(table: string, onChange: Listener): () => void {
  let entry = channels.get(table);

  if (!entry) {
    entry = { channel: null, listeners: new Set(), status: "idle" };
    channels.set(table, entry);
  }
  entry.listeners.add(onChange);

  // Lazily create channel on first listener AND only if online
  if (!entry.channel && isOnline()) {
    try {
      entry.status = "subscribing";
      const channelName = `tbl:${table}`;
      log("subscribe ->", channelName);
      const ch = supabase
        .channel(channelName)
        .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
          log("change", table, payload.eventType);
          entry!.listeners.forEach((l) => { try { l(); } catch (e) { console.warn("[realtime] listener error", e); } });
        })
        .subscribe((status) => {
          log("status", table, status);
          if (status === "SUBSCRIBED") entry!.status = "subscribed";
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") entry!.status = "error";
          else if (status === "CLOSED") entry!.status = "closed";
        });
      entry.channel = ch;
    } catch (e) {
      entry.status = "error";
      console.warn("[realtime] subscribe threw", table, e);
    }
  }

  return () => {
    const e = channels.get(table);
    if (!e) return;
    e.listeners.delete(onChange);
    if (e.listeners.size === 0 && e.channel) {
      log("removeChannel", table);
      try { supabase.removeChannel(e.channel); } catch (err) { console.warn("[realtime] remove threw", err); }
      e.channel = null;
      e.status = "closed";
      channels.delete(table);
    }
  };
}

// Reconnect all channels when network returns
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    log("network online -> resubscribing", channels.size, "channels");
    channels.forEach((entry, table) => {
      if (!entry.channel && entry.listeners.size > 0) {
        try {
          entry.status = "subscribing";
          const ch = supabase
            .channel(`tbl:${table}`)
            .on("postgres_changes", { event: "*", schema: "public", table }, () => {
              entry.listeners.forEach((l) => { try { l(); } catch {} });
            })
            .subscribe((status) => {
              if (status === "SUBSCRIBED") entry.status = "subscribed";
            });
          entry.channel = ch;
        } catch (e) {
          console.warn("[realtime] resubscribe failed", table, e);
        }
      }
    });
  });
  window.addEventListener("offline", () => {
    log("network offline -> tearing down channels");
    channels.forEach((entry, table) => {
      if (entry.channel) {
        try { supabase.removeChannel(entry.channel); } catch {}
        entry.channel = null;
        entry.status = "closed";
      }
    });
  });
}
