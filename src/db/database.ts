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
  proofData?: string; // transaction ID or base64 image
}

export interface DbTreasury {
  id?: number;
  totalBalance: number;
  totalContributionsCollected: number;
  totalPayouts: number;
  retainedReserves: number;
  pendingContributions: number;
}

class CampBethelDB extends Dexie {
  members!: Table<DbMember, number>;
  deaths!: Table<DbDeath, number>;
  contributions!: Table<DbContribution, number>;
  treasury!: Table<DbTreasury, number>;

  constructor() {
    super('campbethel');
    this.version(1).stores({
      members: '++id, memberId, firstName, lastName, phone, campement, status, sousPrefecture',
      deaths: '++id, deceasedMemberId, status, dateOfDeath',
      contributions: '++id, memberId, deathId, status',
      treasury: '++id',
    });
  }
}

export const db = new CampBethelDB();

// Seed database with initial mock data on first run
export async function seedDatabase() {
  const memberCount = await db.members.count();
  if (memberCount > 0) return;

  await db.members.bulkAdd([
    {
      memberId: "MSCB-25-001", firstName: "Jean", lastName: "KOUADIO",
      phone: "+225 07 01 23 45 67", campement: "Kouassikandro", sousPrefecture: "Daloa",
      idType: "CNI", idNumber: "CI-2024-001234", registrationDate: "2025-03-15",
      status: "actif", adhesionPaid: true, contributionStatus: "à_jour",
      totalCoveredPersons: 3,
      secondaryMembers: [
        { id: "s1", name: "Marie KOUADIO", relationship: "Épouse", status: "vivant" },
        { id: "s2", name: "Agnès KOUADIO", relationship: "Mère", status: "vivant" },
      ],
    },
    {
      memberId: "MSCB-25-002", firstName: "Paul", lastName: "BROU",
      phone: "+225 05 98 76 54 32", campement: "Bédiala", sousPrefecture: "Daloa",
      idType: "Permis", idNumber: "P-2023-9876", registrationDate: "2025-04-02",
      status: "actif", adhesionPaid: true, contributionStatus: "en_retard",
      totalCoveredPersons: 2,
      secondaryMembers: [
        { id: "s3", name: "Awa BROU", relationship: "Épouse", status: "vivant" },
      ],
    },
    {
      memberId: "MSCB-25-003", firstName: "Esther", lastName: "YAO",
      phone: "+225 01 23 45 67 89", campement: "Gboguhé", sousPrefecture: "Daloa",
      idType: "CNI", idNumber: "CI-2024-005678", registrationDate: "2025-04-10",
      status: "actif", adhesionPaid: true, contributionStatus: "à_jour",
      totalCoveredPersons: 1,
      secondaryMembers: [],
    },
    {
      memberId: "MSCB-25-004", firstName: "Konan", lastName: "ASSI",
      phone: "+225 07 55 44 33 22", campement: "Issia", sousPrefecture: "Issia",
      idType: "CNI", idNumber: "CI-2023-009012", registrationDate: "2025-05-01",
      status: "actif", adhesionPaid: true, contributionStatus: "à_jour",
      totalCoveredPersons: 2,
      secondaryMembers: [
        { id: "s4", name: "Adjoua ASSI", relationship: "Épouse", status: "vivant" },
      ],
    },
    {
      memberId: "MSCB-26-001", firstName: "Aimé", lastName: "KOFFI",
      phone: "+225 05 11 22 33 44", campement: "Vavoua", sousPrefecture: "Vavoua",
      idType: "Passeport", idNumber: "PA-2025-1111", registrationDate: "2026-01-15",
      status: "actif", adhesionPaid: true, contributionStatus: "à_jour",
      totalCoveredPersons: 3,
      secondaryMembers: [
        { id: "s5", name: "Claudine KOFFI", relationship: "Épouse", status: "vivant" },
        { id: "s6", name: "Berthe KOFFI", relationship: "Mère", status: "vivant" },
      ],
    },
    {
      memberId: "MSCB-26-002", firstName: "Grâce", lastName: "N'GUESSAN",
      phone: "+225 01 99 88 77 66", campement: "Zoukougbeu", sousPrefecture: "Zoukougbeu",
      idType: "CNI", idNumber: "CI-2025-002345", registrationDate: "2026-02-01",
      status: "suspendu", adhesionPaid: true, contributionStatus: "en_retard",
      totalCoveredPersons: 1,
      secondaryMembers: [],
    },
  ]);

  const deathId1 = await db.deaths.add({
    deceasedName: "Yves TAPÉ", deceasedMemberId: "MSCB-25-010",
    dateOfDeath: "2026-02-20", type: "principal", payout: 300000, retained: 0,
    totalExpectedContributions: 14000, totalCollected: 10000, status: "en_cours",
  });

  await db.deaths.add({
    deceasedName: "Bernadette KONÉ", deceasedMemberId: "MSCB-25-005",
    dateOfDeath: "2026-01-10", type: "secondaire", payout: 250000, retained: 50000,
    totalExpectedContributions: 14000, totalCollected: 14000, status: "clôturé",
  });

  await db.contributions.bulkAdd([
    { memberId: "MSCB-25-001", memberName: "Jean KOUADIO", deathId: deathId1 as number, amount: 3000, expectedAmount: 3000, paymentMethod: "especes", status: "payé", date: "2026-02-22" },
    { memberId: "MSCB-25-002", memberName: "Paul BROU", deathId: deathId1 as number, amount: 0, expectedAmount: 2000, paymentMethod: "especes", status: "non_payé" },
    { memberId: "MSCB-25-003", memberName: "Esther YAO", deathId: deathId1 as number, amount: 1000, expectedAmount: 1000, paymentMethod: "wave", status: "payé", date: "2026-02-23" },
    { memberId: "MSCB-25-004", memberName: "Konan ASSI", deathId: deathId1 as number, amount: 1000, expectedAmount: 2000, paymentMethod: "orange", status: "partiel", date: "2026-02-25" },
    { memberId: "MSCB-26-001", memberName: "Aimé KOFFI", deathId: deathId1 as number, amount: 3000, expectedAmount: 3000, paymentMethod: "mtn", status: "payé", date: "2026-02-21" },
    { memberId: "MSCB-26-002", memberName: "Grâce N'GUESSAN", deathId: deathId1 as number, amount: 0, expectedAmount: 1000, paymentMethod: "especes", status: "exonéré" },
  ]);

  await db.treasury.add({
    totalBalance: 485000,
    totalContributionsCollected: 1250000,
    totalPayouts: 850000,
    retainedReserves: 85000,
    pendingContributions: 4000,
  });
}
