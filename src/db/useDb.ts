import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DbMember, DbDeath, DbContribution, DbTreasury, DbUser, DbSettings } from "./database";

function useSupabaseTable<T>(table: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: rows } = await supabase.from(table).select("*").order("created_at", { ascending: false });
    setData((rows || []) as unknown as T[]);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel(`${table}_changes`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [table, fetchData]);

  return { data, loading, refetch: fetchData };
}

export function useMembers() {
  const { data: members, refetch } = useSupabaseTable<DbMember>("members");

  const addMember = async (member: Omit<DbMember, "id" | "created_at" | "updated_at">) => {
    const { error } = await supabase.from("members").insert(member as any);
    if (error) throw error;
    await refetch();
  };

  const updateMember = async (id: string, changes: Partial<DbMember>) => {
    await supabase.from("members").update(changes as any).eq("id", id);
    await refetch();
  };

  const deleteMember = async (id: string) => {
    await supabase.from("members").delete().eq("id", id);
    await refetch();
  };

  return { members, addMember, updateMember, deleteMember };
}

export function useMember(id: string | undefined) {
  const [member, setMember] = useState<DbMember | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    supabase.from("members").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setMember(data as unknown as DbMember);
    });
  }, [id]);

  return member;
}

export function useDeaths() {
  const { data: deaths, refetch } = useSupabaseTable<DbDeath>("deaths");

  const addDeath = async (death: Omit<DbDeath, "id" | "created_at">) => {
    const { data: inserted, error } = await supabase.from("deaths").insert(death as any).select().single();
    if (error) throw error;
    
    const { data: activeMembers } = await supabase.from("members").select("*").eq("status", "actif");
    if (activeMembers && inserted) {
      const contributions = activeMembers.map((m: any) => ({
        member_id: m.member_id,
        member_name: `${m.first_name} ${m.last_name}`,
        death_id: inserted.id,
        amount: 0,
        expected_amount: m.total_covered_persons * 1000,
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
    await supabase.from("deaths").update(changes as any).eq("id", id);
    await refetch();
  };

  return { deaths, addDeath, updateDeath };
}

export function useContributions(deathId?: string) {
  const [contributions, setContributions] = useState<DbContribution[]>([]);

  const fetchContributions = useCallback(async () => {
    let query = supabase.from("contributions").select("*");
    if (deathId) query = query.eq("death_id", deathId);
    const { data } = await query.order("member_name");
    setContributions((data || []) as unknown as DbContribution[]);
  }, [deathId]);

  useEffect(() => {
    fetchContributions();
    const channel = supabase
      .channel(`contributions_${deathId || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contributions" }, () => {
        fetchContributions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deathId, fetchContributions]);

  const updateContribution = async (id: string, changes: Partial<DbContribution>) => {
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
  const [treasury, setTreasury] = useState<DbTreasury | undefined>(undefined);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("treasury").select("*").limit(1).single();
      if (data) setTreasury(data as unknown as DbTreasury);
    };
    fetch();
    const channel = supabase
      .channel("treasury_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "treasury" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
  const [contributions, setContributions] = useState<DbContribution[]>([]);
  
  useEffect(() => {
    if (!memberId) return;
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
  const { data, error } = await supabase.rpc("authenticate_app_user" as any, {
    p_username: username,
    p_password: password,
  });
  
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  
  const user = Array.isArray(data) ? data[0] : data;
  return user as DbUser;
}

export function useSettings() {
  const [settings, setSettings] = useState<DbSettings | undefined>(undefined);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("settings").select("*").limit(1).single();
      if (data) setSettings(data as unknown as DbSettings);
    };
    fetch();
  }, []);

  const updateSettings = async (changes: Partial<DbSettings>) => {
    if (!settings) return;
    const { data } = await supabase.from("settings").update(changes as any).eq("id", settings.id).select().single();
    if (data) setSettings(data as unknown as DbSettings);
  };

  return { settings, updateSettings };
}
