import Dexie, { type Table } from 'dexie';

export interface DbSecondaryMember {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth?: string;
  status: "vivant" | "décédé";
}

export interface DbMember {
  id?: number;
  memberId: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneSecondary?: string;
  whatsapp?: string;
  campement: string;
  sousPrefecture: string;
  idType: string;
  idNumber: string;
  photo?: string;
  registrationDate: string;
  status: "actif" | "suspendu" | "décédé";
  adhesionPaid: boolean;
  secondaryMembers: DbSecondaryMember[];
  totalCoveredPersons: number;
  contributionStatus: "à_jour" | "en_retard";
}

export interface DbDeath {
  id?: number;
  deceasedName: string;
  deceasedMemberId: string;
  dateOfDeath: string;
  type: "principal" | "secondaire";
  payout: number;
  retained: number;
  totalExpectedContributions: number;
  totalCollected: number;
  status: "en_cours" | "clôturé";
}

export interface DbContribution {
  id?: number;
  memberId: string;
  memberName: string;
  deathId: number;
  amount: number;
  expectedAmount: number;
  paymentMethod: "especes" | "wave" | "orange" | "mtn" | "moov";
  status: "payé" | "non_payé" | "partiel" | "exonéré";
  date?: string;
  proofType?: "transaction_id" | "photo";
  proofData?: string;
}

export interface DbTreasury {
  id?: number;
  totalBalance: number;
  totalContributionsCollected: number;
  totalPayouts: number;
  retainedReserves: number;
  pendingContributions: number;
}

export interface DbUser {
  id?: number;
  username: string;
  password: string;
  role: "super_admin" | "admin" | "lecture_seule" | "cotisations" | "membres" | "imprimeur";
  displayName: string;
  isActive: boolean;
}

class CampBethelDB extends Dexie {
  members!: Table<DbMember, number>;
  deaths!: Table<DbDeath, number>;
  contributions!: Table<DbContribution, number>;
  treasury!: Table<DbTreasury, number>;
  users!: Table<DbUser, number>;

  constructor() {
    super('campbethel');
    this.version(2).stores({
      members: '++id, memberId, firstName, lastName, phone, campement, status, sousPrefecture',
      deaths: '++id, deceasedMemberId, status, dateOfDeath',
      contributions: '++id, memberId, deathId, status',
      treasury: '++id',
      users: '++id, username',
    });
  }
}

export const db = new CampBethelDB();

// Generate next member ID: MSCB-YY-NNN
export async function generateMemberId(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `MSCB-${year}-`;
  const allMembers = await db.members.toArray();
  const thisYearMembers = allMembers.filter(m => m.memberId.startsWith(prefix));
  const maxNum = thisYearMembers.reduce((max, m) => {
    const num = parseInt(m.memberId.split('-')[2], 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `${prefix}${nextNum}`;
}

// Seed database with initial data on first run
export async function seedDatabase() {
  // Ensure admin user exists
  const adminExists = await db.users.where('username').equals('admin').first();
  if (!adminExists) {
    await db.users.add({
      username: 'admin',
      password: '12345678',
      role: 'super_admin',
      displayName: 'Super Admin',
      isActive: true,
    });
  }

  // Seed treasury if empty
  const treasuryCount = await db.treasury.count();
  if (treasuryCount === 0) {
    await db.treasury.add({
      totalBalance: 0,
      totalContributionsCollected: 0,
      totalPayouts: 0,
      retainedReserves: 0,
      pendingContributions: 0,
    });
  }
}

// Export all data as JSON
export async function exportAllData(): Promise<string> {
  const data = {
    members: await db.members.toArray(),
    deaths: await db.deaths.toArray(),
    contributions: await db.contributions.toArray(),
    treasury: await db.treasury.toArray(),
    users: await db.users.toArray(),
    exportDate: new Date().toISOString(),
    version: 2,
  };
  return JSON.stringify(data, null, 2);
}

// Import data from JSON
export async function importAllData(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString);
    
    await db.transaction('rw', [db.members, db.deaths, db.contributions, db.treasury, db.users], async () => {
      await db.members.clear();
      await db.deaths.clear();
      await db.contributions.clear();
      await db.treasury.clear();
      
      if (data.members?.length) await db.members.bulkAdd(data.members.map((m: any) => { delete m.id; return m; }));
      if (data.deaths?.length) await db.deaths.bulkAdd(data.deaths.map((d: any) => { delete d.id; return d; }));
      if (data.contributions?.length) await db.contributions.bulkAdd(data.contributions.map((c: any) => { delete c.id; return c; }));
      if (data.treasury?.length) await db.treasury.bulkAdd(data.treasury.map((t: any) => { delete t.id; return t; }));
      if (data.users?.length) {
        await db.users.clear();
        await db.users.bulkAdd(data.users.map((u: any) => { delete u.id; return u; }));
      }
    });
    
    return { success: true, message: `Import réussi : ${data.members?.length || 0} membres, ${data.deaths?.length || 0} décès, ${data.contributions?.length || 0} cotisations` };
  } catch (err: any) {
    return { success: false, message: `Erreur d'import : ${err.message}` };
  }
}
