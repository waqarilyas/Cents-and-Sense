/**
 * Widget Data Provider
 * Writes budget data to JSON file for Android widgets to read
 */

import { Platform } from "react-native";
import { getDatabase } from "../database";
import { widgetService } from "./WidgetService";

interface CategoryData {
  name: string;
  spending: number;
}

interface GoalData {
  name: string;
  currentAmount: number;
  targetAmount: number;
}

interface AccountData {
  name: string;
  type: string;
  balance: number;
}

interface CategoryBudgetData {
  category: string;
  spent: number;
  limit: number;
}

interface WidgetData {
  // Spending widget data
  spending: number;
  budget: number;
  currency: string;
  categories: CategoryData[];

  // Goals widget data
  goals: GoalData[];

  // Accounts widget data
  accounts: AccountData[];

  // Category budgets widget data
  categoryBudgets: CategoryBudgetData[];
}

export class WidgetDataProvider {
  /**
   * Calculate comprehensive widget data for all widget types
   */
  private static async calculateWidgetData(): Promise<WidgetData> {
    try {
      const db = await getDatabase();

      // Get current month boundaries
      const now = new Date();
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).getTime();
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
      ).getTime();

      // --- SPENDING WIDGET DATA ---
      // Get total monthly budget
      const budgetResult = await db.getFirstAsync<{
        total: number | null;
        currency: string | null;
      }>(
        `SELECT SUM(budget_limit) as total, currency 
         FROM budgets 
         WHERE period = 'monthly'
         GROUP BY currency
         ORDER BY total DESC
         LIMIT 1`,
      );

      // Get current month spending
      const spendingResult = await db.getFirstAsync<{ total: number | null }>(
        `SELECT SUM(amount) as total 
         FROM transactions 
         WHERE type = 'expense' 
         AND date >= ? 
         AND date <= ?`,
        [startOfMonth, endOfMonth],
      );

      // Get top spending categories
      const categories = await db.getAllAsync<{
        name: string;
        spending: number;
      }>(
        `SELECT c.name, SUM(t.amount) as spending
         FROM transactions t
         JOIN categories c ON t.categoryId = c.id
         WHERE t.type = 'expense'
         AND t.date >= ?
         AND t.date <= ?
         GROUP BY c.id, c.name
         ORDER BY spending DESC
         LIMIT 5`,
        [startOfMonth, endOfMonth],
      );

      // --- GOALS WIDGET DATA ---
      const goalsData = await db.getAllAsync<GoalData>(
        `SELECT name, currentAmount, targetAmount 
         FROM goals 
         WHERE targetAmount > 0
         ORDER BY (currentAmount * 100.0 / targetAmount) DESC
         LIMIT 3`,
      );

      // --- ACCOUNTS WIDGET DATA ---
      const accountsData = await db.getAllAsync<AccountData>(
        `SELECT name, type, balance 
         FROM accounts 
         ORDER BY balance DESC
         LIMIT 3`,
      );

      // --- CATEGORY BUDGETS WIDGET DATA ---
      const categoryBudgetsData = await db.getAllAsync<{
        category: string;
        budget_limit: number;
        spent: number | null;
      }>(
        `SELECT c.name as category, b.budget_limit, 
                COALESCE(SUM(t.amount), 0) as spent
         FROM budgets b
         JOIN categories c ON b.categoryId = c.id
         LEFT JOIN transactions t ON t.categoryId = c.id 
                  AND t.type = 'expense'
                  AND t.date >= ? 
                  AND t.date <= ?
         WHERE b.period = 'monthly'
         GROUP BY b.id, c.name, b.budget_limit
         ORDER BY (COALESCE(SUM(t.amount), 0) * 100.0 / b.budget_limit) DESC
         LIMIT 3`,
        [startOfMonth, endOfMonth],
      );

      const spending = spendingResult?.total ?? 0;
      const budget = budgetResult?.total ?? 0;
      const currency = budgetResult?.currency ?? "USD";

      console.log("Widget data calculated:", {
        spending,
        budget,
        currency,
        categoriesCount: categories.length,
        goalsCount: goalsData.length,
        accountsCount: accountsData.length,
        categoryBudgetsCount: categoryBudgetsData.length,
      });

      return {
        spending,
        budget,
        currency,
        categories: categories.map((c) => ({
          name: c.name,
          spending: c.spending,
        })),
        goals: goalsData.map((g) => ({
          name: g.name,
          currentAmount: g.currentAmount,
          targetAmount: g.targetAmount,
        })),
        accounts: accountsData.map((a) => ({
          name: a.name,
          type: a.type,
          balance: a.balance,
        })),
        categoryBudgets: categoryBudgetsData.map((cb) => ({
          category: cb.category,
          spent: cb.spent ?? 0,
          limit: cb.budget_limit,
        })),
      };
    } catch (error) {
      console.error("Error calculating widget data:", error);
      // Return default values on error
      return {
        spending: 0,
        budget: 0,
        currency: "USD",
        categories: [],
        goals: [],
        accounts: [],
        categoryBudgets: [],
      };
    }
  }

  /**
   * Write widget data to JSON file
   */
  static async writeWidgetData(): Promise<void> {
    if (Platform.OS !== "android") {
      return;
    }

    try {
      const widgetData = await this.calculateWidgetData();

      // Use native module to write the file (has proper permissions)
      await widgetService.writeWidgetData(widgetData);
    } catch (error) {
      // Just log, don't throw - widgets are optional functionality
      console.warn("[WidgetDataProvider] Failed to write widget data:", error);
    }
  }

  /**
   * Read widget data from JSON file (for debugging)
   */
  static async readWidgetData(): Promise<WidgetData | null> {
    if (Platform.OS !== "android") {
      return null;
    }

    // Reading not needed for now - widgets read directly from file
    return null;
  }
}

export const widgetDataProvider = new WidgetDataProvider();
export default widgetDataProvider;
