import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Alert, Share } from "react-native";
import { getDatabase } from "../database";
import { SETTINGS_STORAGE_KEY } from "../contexts/SettingsContext";

const CURRENCY_STORAGE_KEY = "@budget_app_currency";
const ONBOARDING_KEY = "@budget_app_onboarding_complete";

export interface ExportData {
  exportDate: string;
  appVersion: string;
  user: {
    name: string;
    defaultCurrency: string;
  };
  accounts: any[];
  categories: any[];
  transactions: any[];
  budgets: any[];
  goals: any[];
  subscriptions: any[];
  settings: any;
}

/**
 * Export all app data to a JSON file
 */
export async function exportAllData(): Promise<void> {
  try {
    const db = await getDatabase();

    // Fetch all data
    const [
      userProfileResult,
      accountsResult,
      categoriesResult,
      transactionsResult,
      budgetsResult,
      goalsResult,
      subscriptionsResult,
      settingsRaw,
    ] = await Promise.all([
      db.getAllAsync("SELECT * FROM user_profile LIMIT 1"),
      db.getAllAsync("SELECT * FROM accounts ORDER BY createdAt"),
      db.getAllAsync("SELECT * FROM categories ORDER BY name"),
      db.getAllAsync("SELECT * FROM transactions ORDER BY date DESC"),
      db.getAllAsync("SELECT * FROM budgets ORDER BY createdAt"),
      db.getAllAsync("SELECT * FROM goals ORDER BY createdAt"),
      db.getAllAsync("SELECT * FROM subscriptions ORDER BY createdAt"),
      AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
    ]);

    const userProfile = userProfileResult[0] as any;
    let settings: any = {};
    if (settingsRaw) {
      try {
        settings = JSON.parse(settingsRaw);
      } catch {
        settings = {};
      }
    }

    const exportData: ExportData = {
      exportDate: new Date().toISOString(),
      appVersion: "1.0.0",
      user: {
        name: userProfile?.name || "User",
        defaultCurrency: userProfile?.defaultCurrency || "USD",
      },
      accounts: accountsResult,
      categories: categoriesResult,
      transactions: transactionsResult,
      budgets: budgetsResult,
      goals: goalsResult,
      subscriptions: subscriptionsResult,
      settings,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `cents-and-sense-backup-${new Date().toISOString().split("T")[0]}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, jsonString);

    // Try to share the file
    try {
      if (Platform.OS === "ios") {
        await Share.share({
          url: fileUri,
          title: "Export Cents and Sense Data",
        });
      } else {
        await Share.share({
          message: `Your data has been exported. File location: ${fileUri}`,
          title: "Export Cents and Sense Data",
        });
      }

      Alert.alert(
        "Export Successful",
        `Your data has been exported to:\n${fileName}\n\nFile saved in app documents folder.`,
        [{ text: "OK" }],
      );
    } catch (shareError) {
      console.log("Share cancelled or failed:", shareError);
      Alert.alert(
        "Export Successful",
        `Data exported to:\n${fileUri}\n\nYou can access this file through your file manager.`,
        [{ text: "OK" }],
      );
    }
  } catch (error) {
    console.error("Error exporting data:", error);
    throw new Error("Failed to export data. Please try again.");
  }
}

/**
 * Delete all user data from the database
 */
export async function deleteAllData(): Promise<void> {
  try {
    const db = await getDatabase();

    await db.execAsync(`
      BEGIN TRANSACTION;
      
      -- Delete transactional and related data
      DELETE FROM transactions;
      DELETE FROM budget_period_snapshots;
      DELETE FROM monthly_budgets;
      DELETE FROM budgets;
      DELETE FROM goals;
      DELETE FROM subscriptions;

      -- Delete accounts and categories
      DELETE FROM accounts;
      DELETE FROM categories;

      -- Reset user profile and budget settings
      DELETE FROM user_profile;
      DELETE FROM budget_settings;

      COMMIT;
    `);

    await AsyncStorage.multiRemove([
      SETTINGS_STORAGE_KEY,
      CURRENCY_STORAGE_KEY,
      ONBOARDING_KEY,
    ]);

    console.log("All data deleted successfully");
  } catch (error) {
    console.error("Error deleting all data:", error);
    try {
      const db = await getDatabase();
      await db.execAsync("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }
    throw new Error("Failed to delete data. Please try again.");
  }
}

/**
 * Create a silent safety backup JSON snapshot used before destructive sync actions.
 * Returns the file URI where snapshot is stored.
 */
export async function createSyncSafetyBackup(): Promise<string> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  const [userProfile, accounts, categories, transactions, budgets, goals, subscriptions] =
    await Promise.all([
      db.getAllAsync("SELECT * FROM user_profile ORDER BY updatedAt DESC LIMIT 1"),
      db.getAllAsync("SELECT * FROM accounts ORDER BY updatedAt DESC"),
      db.getAllAsync("SELECT * FROM categories ORDER BY updatedAt DESC"),
      db.getAllAsync("SELECT * FROM transactions ORDER BY updatedAt DESC"),
      db.getAllAsync("SELECT * FROM budgets ORDER BY updatedAt DESC"),
      db.getAllAsync("SELECT * FROM goals ORDER BY updatedAt DESC"),
      db.getAllAsync("SELECT * FROM subscriptions ORDER BY updatedAt DESC"),
    ]);

  const payload = {
    type: "sync_safety_backup",
    createdAt: nowIso,
    userProfile,
    accounts,
    categories,
    transactions,
    budgets,
    goals,
    subscriptions,
  };

  const fileName = `sync-safety-backup-${Date.now()}.json`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2));
  return fileUri;
}

interface DebugSeedOptions {
  userId?: string | null;
  scale?: "medium" | "large";
}

/**
 * Debug helper: generate a large realistic dataset across all major entities.
 * Useful for stress testing sync performance and conflict resolution.
 */
export async function generateLargeDebugData(options?: DebugSeedOptions): Promise<{
  accounts: number;
  categories: number;
  transactions: number;
  budgets: number;
  monthlyBudgets: number;
  goals: number;
  subscriptions: number;
}> {
  const db = await getDatabase();
  const now = Date.now();
  const seedId = `dbg_${now}`;
  const userId = options?.userId ?? null;
  const scale = options?.scale || "medium";

  const counts = scale === "large"
    ? { accounts: 20, categories: 80, transactions: 5000, budgets: 35, monthlyBudgets: 12, goals: 30, subscriptions: 60 }
    : { accounts: 10, categories: 40, transactions: 1500, budgets: 18, monthlyBudgets: 6, goals: 15, subscriptions: 25 };

  const accountIds: string[] = [];
  const expenseCategoryIds: string[] = [];
  const incomeCategoryIds: string[] = [];

  const typeCycle: Array<"checking" | "savings" | "credit_card"> = ["checking", "savings", "credit_card"];
  const colors = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0", "#009688", "#FF5722", "#3F51B5"];
  const frequencies = ["monthly", "yearly", "weekly", "daily"] as const;

  await db.execAsync("BEGIN TRANSACTION");
  try {
    for (let i = 0; i < counts.accounts; i += 1) {
      const id = `${seedId}_acc_${i}`;
      accountIds.push(id);
      const createdAt = now - i * 86400000;
      await db.runAsync(
        "INSERT INTO accounts (id, name, type, balance, currency, isDefault, createdAt, updatedAt, deletedAt, userId, deviceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)",
        [
          id,
          `Debug Account ${i + 1}`,
          typeCycle[i % typeCycle.length],
          Math.round((Math.random() * 50000 + 1000) * 100) / 100,
          "USD",
          i === 0 ? 1 : 0,
          createdAt,
          createdAt,
          userId,
          "debug-seeder",
        ],
      );
    }

    for (let i = 0; i < counts.categories; i += 1) {
      const id = `${seedId}_cat_${i}`;
      const isExpense = i % 4 !== 0;
      if (isExpense) expenseCategoryIds.push(id);
      else incomeCategoryIds.push(id);
      const createdAt = now - i * 3600000;
      await db.runAsync(
        "INSERT INTO categories (id, name, type, color, createdAt, updatedAt, deletedAt, userId, deviceId) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)",
        [
          id,
          isExpense ? `Expense Category ${i + 1}` : `Income Category ${i + 1}`,
          isExpense ? "expense" : "income",
          colors[i % colors.length],
          createdAt,
          createdAt,
          userId,
          "debug-seeder",
        ],
      );
    }

    for (let i = 0; i < counts.budgets; i += 1) {
      const id = `${seedId}_bud_${i}`;
      const createdAt = now - i * 7200000;
      const categoryId = expenseCategoryIds[i % expenseCategoryIds.length];
      await db.runAsync(
        "INSERT INTO budgets (id, categoryId, budget_limit, currency, period, allowCarryover, lastCarryoverAmount, lastPeriodEnd, createdAt, updatedAt, deletedAt, userId, deviceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)",
        [
          id,
          categoryId,
          Math.round((Math.random() * 2500 + 200) * 100) / 100,
          "USD",
          i % 5 === 0 ? "yearly" : "monthly",
          1,
          0,
          0,
          createdAt,
          createdAt,
          userId,
          "debug-seeder",
        ],
      );
    }

    for (let i = 0; i < counts.goals; i += 1) {
      const id = `${seedId}_goal_${i}`;
      const createdAt = now - i * 3600000;
      const target = Math.round((Math.random() * 15000 + 2000) * 100) / 100;
      const progress = Math.round(target * Math.random() * 100) / 100;
      await db.runAsync(
        "INSERT INTO goals (id, name, targetAmount, currentAmount, currency, deadline, createdAt, updatedAt, deletedAt, userId, deviceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)",
        [
          id,
          `Goal ${i + 1}`,
          target,
          progress,
          "USD",
          now + (i + 30) * 86400000,
          createdAt,
          createdAt,
          userId,
          "debug-seeder",
        ],
      );
    }

    for (let i = 0; i < counts.monthlyBudgets; i += 1) {
      const id = `${seedId}_mb_${i}`;
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - i);
      const month = monthDate.getMonth() + 1;
      const year = monthDate.getFullYear();
      const createdAt = now - i * 5400000;
      await db.runAsync(
        "INSERT OR REPLACE INTO monthly_budgets (id, amount, currency, month, year, createdAt, updatedAt, deletedAt, userId, deviceId) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)",
        [
          id,
          Math.round((Math.random() * 7000 + 800) * 100) / 100,
          "USD",
          month,
          year,
          createdAt,
          createdAt,
          userId,
          "debug-seeder",
        ],
      );
    }

    for (let i = 0; i < counts.subscriptions; i += 1) {
      const id = `${seedId}_sub_${i}`;
      const createdAt = now - i * 1800000;
      await db.runAsync(
        "INSERT INTO subscriptions (id, name, amount, currency, categoryId, frequency, startDate, nextDueDate, isActive, reminderDays, notes, createdAt, updatedAt, deletedAt, userId, deviceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)",
        [
          id,
          `Subscription ${i + 1}`,
          Math.round((Math.random() * 100 + 5) * 100) / 100,
          "USD",
          expenseCategoryIds[i % expenseCategoryIds.length],
          frequencies[i % frequencies.length],
          now - (i + 10) * 86400000,
          now + (i % 28) * 86400000,
          1,
          3,
          "Debug seeded subscription",
          createdAt,
          createdAt,
          userId,
          "debug-seeder",
        ],
      );
    }

    for (let i = 0; i < counts.transactions; i += 1) {
      const id = `${seedId}_tx_${i}`;
      const createdAt = now - i * 120000;
      const isExpense = i % 5 !== 0;
      const categoryPool = isExpense ? expenseCategoryIds : incomeCategoryIds;
      const categoryId = categoryPool[i % categoryPool.length];
      const accountId = accountIds[i % accountIds.length];
      const amount = isExpense
        ? Math.round((Math.random() * 300 + 5) * 100) / 100
        : Math.round((Math.random() * 1500 + 100) * 100) / 100;

      await db.runAsync(
        "INSERT INTO transactions (id, accountId, categoryId, amount, currency, description, date, type, subscriptionId, createdAt, updatedAt, deletedAt, userId, deviceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?)",
        [
          id,
          accountId,
          categoryId,
          amount,
          "USD",
          isExpense ? "Debug expense" : "Debug income",
          createdAt,
          isExpense ? "expense" : "income",
          createdAt,
          createdAt,
          userId,
          "debug-seeder",
        ],
      );
    }

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }

  return counts;
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const db = await getDatabase();

    const stats = await Promise.all([
      db.getFirstAsync("SELECT COUNT(*) as count FROM accounts"),
      db.getFirstAsync("SELECT COUNT(*) as count FROM transactions"),
      db.getFirstAsync("SELECT COUNT(*) as count FROM budgets"),
      db.getFirstAsync("SELECT COUNT(*) as count FROM goals"),
      db.getFirstAsync("SELECT COUNT(*) as count FROM subscriptions"),
      db.getFirstAsync("SELECT COUNT(*) as count FROM categories"),
    ]);

    return {
      accounts: (stats[0] as any)?.count || 0,
      transactions: (stats[1] as any)?.count || 0,
      budgets: (stats[2] as any)?.count || 0,
      goals: (stats[3] as any)?.count || 0,
      subscriptions: (stats[4] as any)?.count || 0,
      categories: (stats[5] as any)?.count || 0,
    };
  } catch (error) {
    console.error("Error getting database stats:", error);
    return {
      accounts: 0,
      transactions: 0,
      budgets: 0,
      goals: 0,
      subscriptions: 0,
      categories: 0,
    };
  }
}
