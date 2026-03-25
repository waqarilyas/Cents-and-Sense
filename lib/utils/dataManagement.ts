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
        "✅ Export Successful",
        `Your data has been exported to:\n${fileName}\n\nFile saved in app documents folder.`,
        [{ text: "OK" }],
      );
    } catch (shareError) {
      console.log("Share cancelled or failed:", shareError);
      Alert.alert(
        "✅ Export Successful",
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
