// ─────────────────────────────────────────────
// SUPABASE CONFIG
// Replace these with your actual Supabase project values
// Get them from: https://supabase.com/dashboard → Project Settings → API
// ─────────────────────────────────────────────
const SUPABASE_URL = 'YOUR_SUPABASE_URL';       // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// ─────────────────────────────────────────────
// SQL SCHEMA  (run once in Supabase SQL Editor)
// ─────────────────────────────────────────────
/*

-- 1. Monthly entries per person
CREATE TABLE monthly_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person      text NOT NULL CHECK (person IN ('emir','mayang')),
  year        int  NOT NULL,
  month       int  NOT NULL CHECK (month BETWEEN 1 AND 12),
  income      numeric(15,2) DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(person, year, month)
);

-- 2. Expense entries (actual spending per category per month)
CREATE TABLE expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person      text NOT NULL CHECK (person IN ('emir','mayang','family')),
  year        int  NOT NULL,
  month       int  NOT NULL,
  category    text NOT NULL,
  amount      numeric(15,2) NOT NULL DEFAULT 0,
  note        text,
  created_at  timestamptz DEFAULT now()
);

-- 3. Budget plans (target per category per month per person)
CREATE TABLE budgets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person      text NOT NULL CHECK (person IN ('emir','mayang','family')),
  year        int  NOT NULL,
  month       int  NOT NULL,
  category    text NOT NULL,
  amount      numeric(15,2) NOT NULL DEFAULT 0,
  UNIQUE(person, year, month, category)
);

-- 4. Family contributions (how much each person puts into family pool)
CREATE TABLE family_contributions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person      text NOT NULL CHECK (person IN ('emir','mayang')),
  year        int  NOT NULL,
  month       int  NOT NULL,
  amount      numeric(15,2) NOT NULL DEFAULT 0,
  note        text,
  UNIQUE(person, year, month)
);

-- 5. Savings goals
CREATE TABLE savings_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person      text NOT NULL,
  name        text NOT NULL,
  target      numeric(15,2) NOT NULL,
  current     numeric(15,2) DEFAULT 0,
  deadline    date,
  color       text DEFAULT '#2563eb',
  created_at  timestamptz DEFAULT now()
);

-- Enable RLS (optional but recommended)
ALTER TABLE monthly_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_contributions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals         ENABLE ROW LEVEL SECURITY;

-- For now, allow all (you can add auth later)
CREATE POLICY "allow all" ON monthly_entries       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON expenses              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON budgets               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON family_contributions  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON savings_goals         FOR ALL USING (true) WITH CHECK (true);

*/

// ─────────────────────────────────────────────
// SUPABASE CLIENT (using CDN, no npm needed)
// ─────────────────────────────────────────────
let _sb = null;

function getSB() {
  if (!_sb) {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _sb;
}

// ─────────────────────────────────────────────
// GENERIC HELPERS
// ─────────────────────────────────────────────

async function sbFetch(table, filters = {}) {
  let q = getSB().from(table).select('*');
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function sbUpsert(table, payload, conflictCols) {
  const { data, error } = await getSB()
    .from(table)
    .upsert(payload, { onConflict: conflictCols })
    .select();
  if (error) throw error;
  return data;
}

async function sbInsert(table, payload) {
  const { data, error } = await getSB().from(table).insert(payload).select();
  if (error) throw error;
  return data;
}

async function sbDelete(table, id) {
  const { error } = await getSB().from(table).delete().eq('id', id);
  if (error) throw error;
}

async function sbUpdate(table, id, payload) {
  const { data, error } = await getSB()
    .from(table).update(payload).eq('id', id).select();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────
// DOMAIN HELPERS
// ─────────────────────────────────────────────

// Get all data for a given month (year+month)
async function getMonthData(year, month) {
  const [entries, expenses, budgets, contributions] = await Promise.all([
    sbFetch('monthly_entries', { year, month }),
    sbFetch('expenses', { year, month }),
    sbFetch('budgets', { year, month }),
    sbFetch('family_contributions', { year, month }),
  ]);
  return { entries, expenses, budgets, contributions };
}

// Upsert monthly income for a person
async function saveIncome(person, year, month, income) {
  return sbUpsert('monthly_entries',
    { person, year, month, income, updated_at: new Date().toISOString() },
    'person,year,month'
  );
}

// Upsert budget
async function saveBudget(person, year, month, category, amount) {
  return sbUpsert('budgets',
    { person, year, month, category, amount },
    'person,year,month,category'
  );
}

// Add expense
async function addExpense(person, year, month, category, amount, note = '') {
  return sbInsert('expenses', { person, year, month, category, amount, note });
}

// Upsert family contribution
async function saveContribution(person, year, month, amount, note = '') {
  return sbUpsert('family_contributions',
    { person, year, month, amount, note },
    'person,year,month'
  );
}

// Get last N months of expenses for trend
async function getTrend(person, months = 6) {
  const now = new Date();
  const rows = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    rows.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  const conditions = rows.map(r => `(year.eq.${r.year},month.eq.${r.month})`).join(',');
  const filter = `and(person.eq.${person})`;
  let q = getSB().from('expenses').select('*').eq('person', person);
  // fetch all in range
  const minYear = rows[0].year;
  const { data, error } = await q
    .gte('year', minYear)
    .order('year').order('month');
  if (error) throw error;
  return data;
}

// Get savings goals
async function getSavingsGoals(person) {
  return sbFetch('savings_goals', { person });
}

async function upsertSavingsGoal(goal) {
  if (goal.id) return sbUpdate('savings_goals', goal.id, goal);
  return sbInsert('savings_goals', goal);
}

window.DB = {
  getSB, sbFetch, sbUpsert, sbInsert, sbDelete, sbUpdate,
  getMonthData, saveIncome, saveBudget, addExpense,
  saveContribution, getTrend, getSavingsGoals, upsertSavingsGoal,
};
