import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "budget_planner.db";
const SCHEMA_VERSION = 9; // Increment this when schema changes

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit_card";
  balance: number;
  currency: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  createdAt: number;
}

export interface Transaction {
  id: string;
  accountId?: string;
  categoryId: string;
  amount: number;
  currency: string;
  description: string;
  date: number;
  type: "income" | "expense";
  subscriptionId?: string;
  createdAt: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  budget_limit: number;
  currency: string;
  period: "monthly" | "yearly";
  allowCarryover: boolean;
  lastCarryoverAmount: number;
  lastPeriodEnd: number;
  createdAt: number;
}

export interface MonthlyBudget {
  id: string;
  amount: number;
  currency: string;
  month: number;
  year: number;
  createdAt: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: number;
  createdAt: number;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  categoryId: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  startDate: number;
  nextDueDate: number;
  isActive: boolean;
  reminderDays: number;
  notes?: string;
  createdAt: number;
}

export interface BudgetSettings {
  id: string;
  budgetPeriodStartDay: number; // 1-28, day of month when budget period starts
  enableCarryover: boolean; // Global carryover toggle
  createdAt: number;
  updatedAt: number;
}

export interface BudgetPeriodSnapshot {
  id: string;
  budgetId: string;
  periodStart: number;
  periodEnd: number;
  budgetedAmount: number;
  carryoverIn: number;
  totalAvailable: number;
  spent: number;
  carryoverOut: number;
  createdAt: number;
}

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  // If already initialized, return the db
  if (db) return db;

  // If initialization is in progress, wait for it
  if (initPromise) return initPromise;

  // Start initialization
  initPromise = (async () => {
    const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Disable foreign keys during migration
    await database.execAsync("PRAGMA foreign_keys = OFF;");

    // Check schema version and migrate if needed
    let needsMigration = false;
    try {
      const result = await database.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version;",
      );
      const currentVersion = result?.user_version ?? 0;
      needsMigration = currentVersion < SCHEMA_VERSION;

      // Also check if the transactions table has the correct schema
      if (!needsMigration) {
        try {
          // Check if transactions table exists and has accountId and subscriptionId
          const tableInfo = await database.getAllAsync<{ name: string }>(
            "PRAGMA table_info(transactions);",
          );
          const hasAccountId = tableInfo.some(
            (col) => col.name === "accountId",
          );
          const hasSubscriptionId = tableInfo.some(
            (col) => col.name === "subscriptionId",
          );
          if ((!hasAccountId || !hasSubscriptionId) && tableInfo.length > 0) {
            needsMigration = true;
          }
        } catch (e) {
          // If table doesn't exist, we'll create it below
          needsMigration = true;
        }
      }
    } catch (e) {
      // If PRAGMA fails, assume we need migration
      needsMigration = true;
    }

    if (needsMigration) {
      console.log("Running database migration...");
      // Drop all tables and recreate - simple migration for dev
      await database.execAsync(`
        DROP TABLE IF EXISTS transactions;
        DROP TABLE IF EXISTS budgets;
        DROP TABLE IF EXISTS subscriptions;
        DROP TABLE IF EXISTS categories;
        DROP TABLE IF EXISTS accounts;
        DROP TABLE IF EXISTS goals;
        DROP TABLE IF EXISTS monthly_budgets;
      `);

      // Set new version
      await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    }

    // Re-enable foreign keys
    await database.execAsync("PRAGMA foreign_keys = ON;");

    // Create tables
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('checking', 'savings', 'credit_card')),
        balance REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        color TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        categoryId TEXT NOT NULL,
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
        startDate INTEGER NOT NULL,
        nextDueDate INTEGER NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1,
        reminderDays INTEGER NOT NULL DEFAULT 3,
        notes TEXT,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY(categoryId) REFERENCES categories(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        accountId TEXT,
        categoryId TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        description TEXT,
        date INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        subscriptionId TEXT,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY(accountId) REFERENCES accounts(id) ON DELETE SET NULL,
        FOREIGN KEY(categoryId) REFERENCES categories(id) ON DELETE RESTRICT,
        FOREIGN KEY(subscriptionId) REFERENCES subscriptions(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        categoryId TEXT NOT NULL,
        budget_limit REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')),
        allowCarryover INTEGER NOT NULL DEFAULT 1,
        lastCarryoverAmount REAL NOT NULL DEFAULT 0,
        lastPeriodEnd INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY(categoryId) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS monthly_budgets (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        UNIQUE(month, year)
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        targetAmount REAL NOT NULL,
        currentAmount REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        deadline INTEGER NOT NULL,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS budget_settings (
        id TEXT PRIMARY KEY,
        budgetPeriodStartDay INTEGER NOT NULL DEFAULT 1 CHECK(budgetPeriodStartDay >= 1 AND budgetPeriodStartDay <= 28),
        enableCarryover INTEGER NOT NULL DEFAULT 1,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS budget_period_snapshots (
        id TEXT PRIMARY KEY,
        budgetId TEXT NOT NULL,
        periodStart INTEGER NOT NULL,
        periodEnd INTEGER NOT NULL,
        budgetedAmount REAL NOT NULL,
        carryoverIn REAL NOT NULL DEFAULT 0,
        totalAvailable REAL NOT NULL,
        spent REAL NOT NULL,
        carryoverOut REAL NOT NULL DEFAULT 0,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY(budgetId) REFERENCES budgets(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_accountId ON transactions(accountId);
      CREATE INDEX IF NOT EXISTS idx_transactions_categoryId ON transactions(categoryId);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_subscriptionId ON transactions(subscriptionId);
      CREATE INDEX IF NOT EXISTS idx_budget_snapshots_budgetId ON budget_period_snapshots(budgetId);
      CREATE INDEX IF NOT EXISTS idx_budget_snapshots_period ON budget_period_snapshots(periodStart, periodEnd);
      CREATE INDEX IF NOT EXISTS idx_budgets_categoryId ON budgets(categoryId);
      CREATE INDEX IF NOT EXISTS idx_monthly_budgets_month_year ON monthly_budgets(month, year);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_nextDueDate ON subscriptions(nextDueDate);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_isActive ON subscriptions(isActive);
    `);

    db = database;
    return database;
  })();

  return initPromise;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
