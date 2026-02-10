import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "budget_planner.db";
const SCHEMA_VERSION = 11; // Increment this when schema changes

export interface UserProfile {
  id: string;
  name: string;
  defaultCurrency: string;
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit_card";
  balance: number;
  currency: string;
  isDefault: boolean;
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
  accountId: string;
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

/**
 * Safely migrate database from one version to another
 * Creates backups before migration and rolls back on failure
 */
async function migrateDatabase(
  database: SQLite.SQLiteDatabase,
  fromVersion: number,
  toVersion: number,
): Promise<void> {
  console.log(`Migrating database from version ${fromVersion} to ${toVersion}`);

  try {
    // Begin transaction
    await database.execAsync("BEGIN TRANSACTION");

    // For initial setup (version 0), just create tables
    if (fromVersion === 0) {
      console.log("Initial database setup - no backup needed");
      await database.execAsync(`PRAGMA user_version = ${toVersion};`);
      await database.execAsync("COMMIT");
      return;
    }

    // Create backup tables for existing data
    console.log("Creating backup tables...");
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions_backup AS SELECT * FROM transactions;
      CREATE TABLE IF NOT EXISTS budgets_backup AS SELECT * FROM budgets;
      CREATE TABLE IF NOT EXISTS subscriptions_backup AS SELECT * FROM subscriptions;
      CREATE TABLE IF NOT EXISTS categories_backup AS SELECT * FROM categories;
      CREATE TABLE IF NOT EXISTS accounts_backup AS SELECT * FROM accounts;
      CREATE TABLE IF NOT EXISTS goals_backup AS SELECT * FROM goals;
      CREATE TABLE IF NOT EXISTS monthly_budgets_backup AS SELECT * FROM monthly_budgets;
    `);

    // Apply version-specific migrations
    for (let version = fromVersion + 1; version <= toVersion; version++) {
      console.log(`Applying migration for version ${version}...`);
      await applyMigration(database, version);
    }

    // Migration successful, drop backup tables
    console.log("Migration successful, cleaning up backups...");
    await database.execAsync(`
      DROP TABLE IF EXISTS transactions_backup;
      DROP TABLE IF EXISTS budgets_backup;
      DROP TABLE IF EXISTS subscriptions_backup;
      DROP TABLE IF EXISTS categories_backup;
      DROP TABLE IF EXISTS accounts_backup;
      DROP TABLE IF EXISTS goals_backup;
      DROP TABLE IF EXISTS monthly_budgets_backup;
    `);

    // Update version
    await database.execAsync(`PRAGMA user_version = ${toVersion};`);

    // Commit transaction
    await database.execAsync("COMMIT");
    console.log("Database migration completed successfully");
  } catch (error) {
    console.error("Migration failed, rolling back:", error);

    try {
      // Rollback transaction
      await database.execAsync("ROLLBACK");

      // Restore from backup if backups exist
      console.log("Attempting to restore from backup...");
      await database.execAsync(`
        DROP TABLE IF EXISTS transactions;
        DROP TABLE IF EXISTS budgets;
        DROP TABLE IF EXISTS subscriptions;
        DROP TABLE IF EXISTS categories;
        DROP TABLE IF EXISTS accounts;
        DROP TABLE IF EXISTS goals;
        DROP TABLE IF EXISTS monthly_budgets;
        
        ALTER TABLE transactions_backup RENAME TO transactions;
        ALTER TABLE budgets_backup RENAME TO budgets;
        ALTER TABLE subscriptions_backup RENAME TO subscriptions;
        ALTER TABLE categories_backup RENAME TO categories;
        ALTER TABLE accounts_backup RENAME TO accounts;
        ALTER TABLE goals_backup RENAME TO goals;
        ALTER TABLE monthly_budgets_backup RENAME TO monthly_budgets;
      `);
      console.log("Successfully restored from backup");
    } catch (restoreError) {
      console.error("Failed to restore from backup:", restoreError);
    }

    throw error;
  }
}

/**
 * Apply migration for a specific version
 * Add new version cases as schema evolves
 */
async function applyMigration(
  database: SQLite.SQLiteDatabase,
  version: number,
): Promise<void> {
  switch (version) {
    case 1:
      // Initial schema - tables already created
      console.log("Version 1 - Initial schema");
      break;

    case 2:
      // Add currency support to accounts
      console.log("Version 2 - Adding currency to accounts");
      await database.execAsync(`
        ALTER TABLE accounts ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
      `);
      break;

    case 3:
      // Add currency to transactions
      console.log("Version 3 - Adding currency to transactions");
      await database.execAsync(`
        ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
      `);
      break;

    case 4:
      // Add accountId to transactions (was missing in early versions)
      console.log("Version 4 - Adding accountId to transactions");
      await database.execAsync(`
        ALTER TABLE transactions ADD COLUMN accountId TEXT;
      `);
      break;

    case 5:
      // Add subscriptions table
      console.log("Version 5 - Creating subscriptions table");
      await database.execAsync(`
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
      `);
      // Add subscriptionId to transactions
      await database.execAsync(`
        ALTER TABLE transactions ADD COLUMN subscriptionId TEXT;
      `);
      break;

    case 6:
      // Add goals table
      console.log("Version 6 - Creating goals table");
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS goals (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          targetAmount REAL NOT NULL,
          currentAmount REAL NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'USD',
          deadline INTEGER NOT NULL,
          createdAt INTEGER NOT NULL
        );
      `);
      break;

    case 7:
      // Add budget_settings table
      console.log("Version 7 - Creating budget_settings table");
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS budget_settings (
          id TEXT PRIMARY KEY,
          budgetPeriodStartDay INTEGER NOT NULL DEFAULT 1 CHECK(budgetPeriodStartDay >= 1 AND budgetPeriodStartDay <= 28),
          enableCarryover INTEGER NOT NULL DEFAULT 1,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
      `);
      break;

    case 8:
      // Add monthly_budgets table and currency to budgets
      console.log("Version 8 - Adding monthly_budgets and currency to budgets");
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS monthly_budgets (
          id TEXT PRIMARY KEY,
          amount REAL NOT NULL,
          currency TEXT NOT NULL DEFAULT 'USD',
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          createdAt INTEGER NOT NULL,
          UNIQUE(month, year)
        );
      `);
      await database.execAsync(`
        ALTER TABLE budgets ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
      `);
      break;

    case 9:
      // Add carryover fields to budgets
      console.log("Version 9 - Adding carryover fields to budgets");
      await database.execAsync(`
        ALTER TABLE budgets ADD COLUMN allowCarryover INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE budgets ADD COLUMN lastCarryoverAmount REAL NOT NULL DEFAULT 0;
        ALTER TABLE budgets ADD COLUMN lastPeriodEnd INTEGER NOT NULL DEFAULT 0;
      `);
      break;

    case 10:
      // Add user_profile and budget_period_snapshots tables
      console.log(
        "Version 10 - Adding user_profile and budget_period_snapshots",
      );
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS user_profile (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          defaultCurrency TEXT NOT NULL DEFAULT 'USD',
          onboardingCompleted INTEGER NOT NULL DEFAULT 0,
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
      `);
      break;

    case 11:
      // Add isDefault flag to accounts
      console.log("Version 11 - Adding isDefault to accounts");
      await database.execAsync(`
        ALTER TABLE accounts ADD COLUMN isDefault INTEGER NOT NULL DEFAULT 0;
      `);
      // Auto-set the first account as default if any exist
      await database.execAsync(`
        UPDATE accounts SET isDefault = 1 WHERE id = (
          SELECT id FROM accounts ORDER BY createdAt ASC LIMIT 1
        );
      `);
      break;

    default:
      console.warn(`No migration defined for version ${version}`);
  }
}

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
      const dbVersion = await database.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version;",
      );
      const fromVersion = dbVersion?.user_version || 0;
      console.log(
        `Running database migration from version ${fromVersion} to ${SCHEMA_VERSION}...`,
      );
      await migrateDatabase(database, fromVersion, SCHEMA_VERSION);
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
        isDefault INTEGER NOT NULL DEFAULT 0,
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

      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        defaultCurrency TEXT NOT NULL DEFAULT 'USD',
        onboardingCompleted INTEGER NOT NULL DEFAULT 0,
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
      CREATE INDEX IF NOT EXISTS idx_accounts_isDefault ON accounts(isDefault);
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

  // Verify the database connection is still valid
  try {
    await db.getFirstAsync("SELECT 1;");
    return db;
  } catch (error) {
    // Connection is stale, reset and reinitialize
    console.log("Database connection stale, reinitializing...");
    db = null;
    initPromise = null;
    return initializeDatabase();
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    try {
      await db.closeAsync();
    } catch (error) {
      console.error("Error closing database:", error);
    } finally {
      db = null;
      initPromise = null;
    }
  }
}
