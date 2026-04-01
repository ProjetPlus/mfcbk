import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DbMember, type DbDeath, type DbContribution, type DbUser } from './database';

export function useMembers() {
  const members = useLiveQuery(() => db.members.toArray()) ?? [];
  return {
    members,
    addMember: (member: Omit<DbMember, 'id'>) => db.members.add(member),
    updateMember: (id: number, changes: Partial<DbMember>) => db.members.update(id, changes),
    deleteMember: (id: number) => db.members.delete(id),
    getMemberByMemberId: (memberId: string) => db.members.where('memberId').equals(memberId).first(),
  };
}

export function useMember(id: number | undefined) {
  return useLiveQuery(() => id ? db.members.get(id) : undefined, [id]);
}

export function useDeaths() {
  const deaths = useLiveQuery(() => db.deaths.toArray()) ?? [];
  return {
    deaths,
    addDeath: async (death: Omit<DbDeath, 'id'>) => {
      const deathId = await db.deaths.add(death);
      // Auto-generate contribution entries for all active members
      const activeMembers = await db.members.where('status').equals('actif').toArray();
      const contributions: Omit<DbContribution, 'id'>[] = activeMembers.map(m => ({
        memberId: m.memberId,
        memberName: `${m.firstName} ${m.lastName}`,
        deathId: deathId as number,
        amount: 0,
        expectedAmount: m.totalCoveredPersons * 1000,
        paymentMethod: "especes" as const,
        status: "non_payé" as const,
      }));
      await db.contributions.bulkAdd(contributions);
      // Update death totals
      const totalExpected = contributions.reduce((s, c) => s + c.expectedAmount, 0);
      await db.deaths.update(deathId, { totalExpectedContributions: totalExpected });
      return deathId;
    },
    updateDeath: (id: number, changes: Partial<DbDeath>) => db.deaths.update(id, changes),
  };
}

export function useContributions(deathId?: number) {
  const contributions = useLiveQuery(
    () => deathId ? db.contributions.where('deathId').equals(deathId).toArray() : db.contributions.toArray(),
    [deathId]
  ) ?? [];

  return {
    contributions,
    addContribution: (c: Omit<DbContribution, 'id'>) => db.contributions.add(c),
    updateContribution: async (id: number, changes: Partial<DbContribution>) => {
      await db.contributions.update(id, changes);
      // Recalculate death totals
      const contribution = await db.contributions.get(id);
      if (contribution) {
        const allForDeath = await db.contributions.where('deathId').equals(contribution.deathId).toArray();
        const totalCollected = allForDeath.reduce((s, c) => s + c.amount, 0);
        await db.deaths.update(contribution.deathId, { totalCollected });
        // Update treasury
        await recalcTreasury();
      }
    },
  };
}

export function useAllContributions() {
  return useLiveQuery(() => db.contributions.toArray()) ?? [];
}

export function useTreasury() {
  return useLiveQuery(() => db.treasury.toCollection().first());
}

async function recalcTreasury() {
  const allContributions = await db.contributions.toArray();
  const allDeaths = await db.deaths.toArray();
  const totalCollected = allContributions.filter(c => c.status === 'payé' || c.status === 'partiel').reduce((s, c) => s + c.amount, 0);
  const totalPayouts = allDeaths.filter(d => d.status === 'clôturé' || d.status === 'en_cours').reduce((s, d) => s + d.payout, 0);
  const retainedReserves = allDeaths.reduce((s, d) => s + d.retained, 0);
  const pending = allContributions.filter(c => c.status === 'non_payé' || c.status === 'partiel').reduce((s, c) => s + (c.expectedAmount - c.amount), 0);
  const treasury = await db.treasury.toCollection().first();
  if (treasury?.id) {
    await db.treasury.update(treasury.id, {
      totalContributionsCollected: totalCollected,
      totalPayouts,
      retainedReserves,
      totalBalance: totalCollected - totalPayouts + retainedReserves,
      pendingContributions: pending,
    });
  }
}

export function useContributionsForMember(memberId: string) {
  return useLiveQuery(() => db.contributions.where('memberId').equals(memberId).toArray(), [memberId]) ?? [];
}

export function useUsers() {
  const users = useLiveQuery(() => db.users.toArray()) ?? [];
  return {
    users,
    addUser: (user: Omit<DbUser, 'id'>) => db.users.add(user),
    updateUser: (id: number, changes: Partial<DbUser>) => db.users.update(id, changes),
    deleteUser: (id: number) => db.users.delete(id),
  };
}

export async function authenticateUser(username: string, password: string): Promise<DbUser | null> {
  const user = await db.users.where('username').equals(username).first();
  if (user && user.password === password && user.isActive) {
    return user;
  }
  return null;
}
