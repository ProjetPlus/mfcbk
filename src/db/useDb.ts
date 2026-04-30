import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DbMember, DbDeath, DbContribution, DbTreasury, DbUser, DbSettings } from "./database";
import { getCache, setCache, getCacheSingle, setCacheSingle, enqueue, isOnline, authenticateOffline, cacheUserCredentials } from "@/lib/offline";
import { subscribeTable } from "@/lib/realtime";

function useSupabaseTable<T>(table: string) {
  const [data, setData] = useState<T[]>(() => getCache<T>(table));
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isOnline()) { setLoading(false); return; }
    try {
      const { data: rows } = await (supabase as any).from(table).select("*").order("created_at", { ascending: false });
      const list = (rows || []) as unknown as T[];
      setData(list);
      setCache(table, list);
    } catch (e) {
      console.warn("[offline] fetch failed for", table, e);
    }
    setLoading(false);
  }, [table]);

  useEffect(() => {
    fetchData();
    const unsub = subscribeTable(table, fetchData);
    return unsub;
  }, [table, fetchData]);

  return { data, loading, refetch: fetchData };
}

export function useMembers() {
  const { data: members, refetch } = useSupabaseTable<DbMember>("members");

  const addMember = async (member: Omit<DbMember, "id" | "created_at" | "updated_at">) => {
    if (!isOnline()) {
      enqueue({ table: "members", op: "insert", payload: member });
      const local = [{ ...member, id: crypto.randomUUID(), created_at: new Date().toISOString() } as any, ...members];
      setCache("members", local);
      return;
    }
    const { error } = await supabase.from("members").insert(member as any);
    if (error) {
      console.error("[addMember] supabase error:", error);
      throw new Error(error.message || "Erreur d'enregistrement du membre");
    }
    await refetch();
  };

  const updateMember = async (id: string, changes: Partial<DbMember>) => {
    if (!isOnline()) {
      enqueue({ table: "members", op: "update", payload: changes, match: { column: "id", value: id } });
      setCache("members", members.map(m => m.id === id ? { ...m, ...changes } : m));
      return;
    }
    const { error } = await supabase.from("members").update(changes as any).eq("id", id);
    if (error) { console.error("[updateMember]", error); throw new Error(error.message); }
    await refetch();
  };

  const deleteMember = async (id: string) => {
    if (!isOnline()) {
      enqueue({ table: "members", op: "delete", match: { column: "id", value: id } });
      setCache("members", members.filter(m => m.id !== id));
      return;
    }
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) { console.error("[deleteMember]", error); throw new Error(error.message); }
    await refetch();
  };

  return { members, addMember, updateMember, deleteMember };
}

export function useMember(id: string | undefined) {
  const [member, setMember] = useState<DbMember | undefined>(() => {
    if (!id) return undefined;
    return getCache<DbMember>("members").find(m => m.id === id);
  });

  useEffect(() => {
    if (!id) return;
    if (!isOnline()) return;
    supabase.from("members").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setMember(data as unknown as DbMember);
    });
  }, [id]);

  return member;
}

export function useDeaths() {
  const { data: deaths, refetch } = useSupabaseTable<DbDeath>("deaths");

  const addDeath = async (death: Omit<DbDeath, "id" | "created_at">) => {
    if (!isOnline()) {
      enqueue({ table: "deaths", op: "insert", payload: death });
      const local = [{ ...death, id: crypto.randomUUID(), created_at: new Date().toISOString() } as any, ...deaths];
      setCache("deaths", local);
      return;
    }
    const { data: inserted, error } = await supabase.from("deaths").insert(death as any).select().single();
    if (error) { console.error("[addDeath]", error); throw new Error(error.message); }
    
    // Pull contribution amount dynamically from settings (changes apply everywhere)
    const { data: settingsRow } = await supabase.from("settings").select("contribution_amount").limit(1).single();
    const perPerson = settingsRow?.contribution_amount ?? 1000;
    
    const { data: activeMembers } = await supabase.from("members").select("*").eq("status", "actif");
    if (activeMembers && inserted) {
      const contributions = activeMembers.map((m: any) => ({
        member_id: m.member_id,
        member_name: `${m.first_name} ${m.last_name}`,
        death_id: inserted.id,
        amount: 0,
        expected_amount: m.total_covered_persons * perPerson,
        payment_method: "especes",
        status: "non_payé",
      }));
      await supabase.from("contributions").insert(contributions);
      
      const totalExpected = contributions.reduce((s: number, c: any) => s + c.expected_amount, 0);
      await supabase.from("deaths").update({ total_expected_contributions: totalExpected }).eq("id", inserted.id);
    }
    
    await refetch();
    return inserted?.id;
  };

  const updateDeath = async (id: string, changes: Partial<DbDeath>) => {
    if (!isOnline()) {
      enqueue({ table: "deaths", op: "update", payload: changes, match: { column: "id", value: id } });
      setCache("deaths", deaths.map(d => d.id === id ? { ...d, ...changes } : d));
      return;
    }
    await supabase.from("deaths").update(changes as any).eq("id", id);
    await refetch();
  };

  return { deaths, addDeath, updateDeath };
}

export function useContributions(deathId?: string) {
  const [contributions, setContributions] = useState<DbContribution[]>(() => {
    const all = getCache<DbContribution>("contributions");
    return deathId ? all.filter(c => c.death_id === deathId) : all;
  });

  const fetchContributions = useCallback(async () => {
    if (!isOnline()) return;
    let query = supabase.from("contributions").select("*");
    if (deathId) query = query.eq("death_id", deathId);
    const { data } = await query.order("member_name");
    const list = (data || []) as unknown as DbContribution[];
    setContributions(list);
    if (!deathId) setCache("contributions", list);
  }, [deathId]);

  useEffect(() => {
    fetchContributions();
    const unsub = subscribeTable("contributions", fetchContributions);
    return unsub;
  }, [deathId, fetchContributions]);

  const updateContribution = async (id: string, changes: Partial<DbContribution>) => {
    if (!isOnline()) {
      enqueue({ table: "contributions", op: "update", payload: changes, match: { column: "id", value: id } });
      setContributions(contributions.map(c => c.id === id ? { ...c, ...changes } : c));
      return;
    }
    await supabase.from("contributions").update(changes as any).eq("id", id);
    
    const contrib = contributions.find(c => c.id === id);
    if (contrib) {
      const { data: allForDeath } = await supabase.from("contributions").select("*").eq("death_id", contrib.death_id);
      if (allForDeath) {
        const totalCollected = allForDeath.reduce((s: number, c: any) => s + c.amount, 0);
        await supabase.from("deaths").update({ total_collected: totalCollected }).eq("id", contrib.death_id);
      }
      await recalcTreasury();
    }
    
    await fetchContributions();
  };

  return { contributions, updateContribution };
}

export function useAllContributions() {
  const { data } = useSupabaseTable<DbContribution>("contributions");
  return data;
}

export function useTreasury() {
  const [treasury, setTreasury] = useState<DbTreasury | undefined>(() => getCacheSingle<DbTreasury>("treasury"));

  useEffect(() => {
    const fetchT = async () => {
      if (!isOnline()) return;
      try {
        const { data } = await supabase.from("treasury").select("*").limit(1).single();
        if (data) {
          setTreasury(data as unknown as DbTreasury);
          setCacheSingle("treasury", data);
        }
      } catch (e) { console.warn("[treasury] fetch failed", e); }
    };
    fetchT();
    const unsub = subscribeTable("treasury", fetchT);
    return unsub;
  }, []);

  return treasury;
}

async function recalcTreasury() {
  const { data: allContributions } = await supabase.from("contributions").select("*");
  const { data: allDeaths } = await supabase.from("deaths").select("*");
  const { data: treasuryRow } = await supabase.from("treasury").select("id").limit(1).single();
  
  if (!treasuryRow) return;
  
  const contributions = allContributions || [];
  const deaths = allDeaths || [];
  
  const totalCollected = contributions.filter((c: any) => c.status === "payé" || c.status === "partiel").reduce((s: number, c: any) => s + c.amount, 0);
  const totalPayouts = deaths.filter((d: any) => d.status === "clôturé" || d.status === "en_cours").reduce((s: number, d: any) => s + d.payout, 0);
  const retainedReserves = deaths.reduce((s: number, d: any) => s + d.retained, 0);
  const pending = contributions.filter((c: any) => c.status === "non_payé" || c.status === "partiel").reduce((s: number, c: any) => s + (c.expected_amount - c.amount), 0);
  
  await supabase.from("treasury").update({
    total_contributions_collected: totalCollected,
    total_payouts: totalPayouts,
    retained_reserves: retainedReserves,
    total_balance: totalCollected - totalPayouts + retainedReserves,
    pending_contributions: pending,
  }).eq("id", treasuryRow.id);
}

export function useContributionsForMember(memberId: string) {
  const [contributions, setContributions] = useState<DbContribution[]>(() =>
    getCache<DbContribution>("contributions").filter(c => c.member_id === memberId)
  );
  
  useEffect(() => {
    if (!memberId || !isOnline()) return;
    supabase.from("contributions").select("*").eq("member_id", memberId).then(({ data }) => {
      setContributions((data || []) as unknown as DbContribution[]);
    });
  }, [memberId]);

  return contributions;
}

export function useUsers() {
  const { data: users, refetch } = useSupabaseTable<DbUser>("app_users");

  const addUser = async (user: { username: string; password: string; role: string; display_name: string }) => {
    const { error } = await supabase.rpc("create_app_user" as any, {
      p_username: user.username,
      p_password: user.password,
      p_role: user.role,
      p_display_name: user.display_name,
    });
    if (error) throw error;
    await refetch();
  };

  const updateUser = async (id: string, changes: Partial<DbUser>) => {
    await supabase.from("app_users").update(changes as any).eq("id", id);
    await refetch();
  };

  const deleteUser = async (id: string) => {
    await supabase.from("app_users").delete().eq("id", id);
    await refetch();
  };

  return { users, addUser, updateUser, deleteUser };
}

export async function authenticateUser(username: string, password: string): Promise<DbUser | null> {
  // Offline → check local credentials cache
  if (!isOnline()) {
    const offline = await authenticateOffline(username, password);
    return offline as DbUser | null;
  }

  try {
    const { data, error } = await supabase.rpc("authenticate_app_user" as any, {
      p_username: username,
      p_password: password,
    });
    
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      // Fallback to offline cache (e.g. server unreachable)
      return (await authenticateOffline(username, password)) as DbUser | null;
    }
    
    const user = (Array.isArray(data) ? data[0] : data) as DbUser;
    // Cache credentials so the same user can log in offline next time
    await cacheUserCredentials(username, password, user);
    return user;
  } catch {
    return (await authenticateOffline(username, password)) as DbUser | null;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<DbSettings | undefined>(() => getCacheSingle<DbSettings>("settings"));

  useEffect(() => {
    const fetchS = async () => {
      if (!isOnline()) return;
      try {
        const { data } = await supabase.from("settings").select("*").limit(1).single();
        if (data) {
          setSettings(data as unknown as DbSettings);
          setCacheSingle("settings", data);
        }
      } catch (e) { console.warn("[settings] fetch failed", e); }
    };
    fetchS();
    const unsub = subscribeTable("settings", fetchS);
    return unsub;
  }, []);

  const updateSettings = async (changes: Partial<DbSettings>) => {
    if (!settings) return;
    if (!isOnline()) {
      enqueue({ table: "settings", op: "update", payload: changes, match: { column: "id", value: settings.id } });
      const updated = { ...settings, ...changes };
      setSettings(updated);
      setCacheSingle("settings", updated);
      return;
    }
    const { data } = await supabase.from("settings").update(changes as any).eq("id", settings.id).select().single();
    if (data) {
      setSettings(data as unknown as DbSettings);
      setCacheSingle("settings", data);
    }
  };

  return { settings, updateSettings };
}
