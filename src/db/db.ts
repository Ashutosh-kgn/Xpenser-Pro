import Dexie, { type Table } from 'dexie';

export interface Transaction {
  id?: number;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  familyMember?: 'Self' | 'Partner' | 'Child';
  status?: 'pending' | 'approved' | 'completed';
}

export interface Subscription {
  id?: number;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string; // YYYY-MM-DD
  status: 'active' | 'paused';
  isUnused?: boolean;
  category?: string;
  paymentMethod?: string;
}

export interface Investment {
  id?: number;
  name: string;
  type: 'stock' | 'etf' | 'crypto' | 'mutual_fund' | 'gold' | 'real_estate' | 'bonds' | 'fd' | 'ppf' | 'commodities';
  amountInvested: number;
  currentValue: number;
  quantity: number;
  sipAmount: number; // 0 if none
  symbol: string;
}

export interface Goal {
  id?: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
}

export interface MonthSummary {
  yearMonth: string; // "YYYY-MM"
  income: number;
  expenses: number;
  budget: number;
  remaining: number;
  carryForward: number;
  openingBalance: number;
}

export interface UserProfile {
  id: string; // "profile"
  name: string;
  xp: number;
  level: number;
  streak: number;
  budgetMode: 'salary' | 'vacation' | 'emergency' | 'festival' | 'student' | 'ai';
  theme: 'dark' | 'light' | 'amoled';
  currency?: string;
  incomeRange?: string;
  monthlyIncomeLimit?: number;
  monthlyExpenseLimit?: number;
  country?: string;
}

class XpenserDB extends Dexie {
  transactions!: Table<Transaction>;
  subscriptions!: Table<Subscription>;
  investments!: Table<Investment>;
  goals!: Table<Goal>;
  userProfile!: Table<UserProfile>;
  months!: Table<MonthSummary>;

  constructor() {
    super('XpenserOS_DB');
    this.version(2).stores({
      transactions: '++id, type, category, date, familyMember, status',
      subscriptions: '++id, name, status',
      investments: '++id, name, type',
      goals: '++id, name',
      userProfile: 'id',
      months: 'yearMonth'
    });
  }
}

export const db = new XpenserDB();

// Mock Seed function to populate DB
export async function seedDatabase() {
  const profileCount = await db.userProfile.count();
  if (profileCount > 0) return; // DB already seeded

  // 1. Seed Profile
  await db.userProfile.put({
    id: 'profile',
    name: 'Ashutosh',
    xp: 0,
    level: 1,
    streak: 0,
    budgetMode: 'ai',
    theme: 'dark',
    monthlyIncomeLimit: 0,
    monthlyExpenseLimit: 0
  });

  // 2. Seed Goals
  await db.goals.bulkAdd([]);

  // 3. Seed Subscriptions
  await db.subscriptions.bulkAdd([]);

  // 4. Seed Investments
  await db.investments.bulkAdd([]);

  // 5. Seed Transactions (Last 30 Days)
  await db.transactions.bulkAdd([]);
}
