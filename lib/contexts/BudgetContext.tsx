import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Budget,
  MonthlyBudget,
  BudgetPeriodSnapshot,
  getDatabase,
} from "../database";
import {
  getCurrentPeriod,
  getPreviousPeriod,
  needsPeriodTransition,
} from "../utils/periodCalculations";
import { groupBudgetsByCurrency } from "../utils/currencyHelpers";
import widgetService from "../services/WidgetService";
import {
  validateAmount,
  validateString,
  validateId,
  ValidationError,
} from "../utils/validation";
import { Alert } from "react-native";
import { SETTINGS_STORAGE_KEY } from "./SettingsContext";

interface BudgetWithCarryover extends Budget {
  carryoverAmount: number;
  availableAmount: number;
}

interface BudgetContextType {
  budgets: Budget[];
  budgetsWithCarryover: BudgetWithCarryover[];
  monthlyBudget: MonthlyBudget | null;
  loading: boolean;
  error: string | null;
  addBudget: (
    categoryId: string,
    amount: number,
    period: "monthly" | "yearly",
    currency?: string,
    allowCarryover?: boolean,
  ) => Promise<void>;
  updateBudget: (
    id: string,
    amount: number,
    period: "monthly" | "yearly",
    currency?: string,
  ) => Promise<void>;
  toggleBudgetCarryover: (id: string, enabled: boolean) => Promise<void>;
  setMonthlyBudget: (amount: number, currency?: string) => Promise<void>;
  clearMonthlyBudget: () => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  getBudget: (id: string) => Budget | undefined;
  getBudgetByCategory: (categoryId: string) => Budget | undefined;
  getBudgetsByCurrency: (currency: string) => Budget[];
  getAllBudgets: () => Budget[];
  processPeriodTransitions: () => Promise<void>;
  refreshBudgets: () => Promise<void>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [monthlyBudget, setMonthlyBudgetState] = useState<MonthlyBudget | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = await getDatabase();
      const result = await db.getAllAsync<Budget>(
        "SELECT * FROM budgets WHERE deletedAt IS NULL ORDER BY createdAt DESC",
      );
      setBudgets(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load budgets");
      console.error("[v0] Error loading budgets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonthlyBudget = useCallback(async () => {
    try {
      const db = await getDatabase();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const result = await db.getFirstAsync<MonthlyBudget>(
        "SELECT * FROM monthly_budgets WHERE month = ? AND year = ? AND deletedAt IS NULL LIMIT 1",
        [month, year],
      );
      setMonthlyBudgetState(result || null);
    } catch (err) {
      console.error("[v0] Error loading monthly budget:", err);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
    loadMonthlyBudget();
  }, [loadBudgets, loadMonthlyBudget]);

  const addBudget = useCallback(
    async (
      categoryId: string,
      amount: number,
      period: "monthly" | "yearly",
      currency: string = "USD",
      allowCarryover: boolean = true,
    ) => {
      try {
        // Validate inputs
        const validCategoryId = validateId(categoryId, "categoryId");
        const validAmount = validateAmount(amount, "budget amount", {
          allowZero: false,
          allowNegative: false,
          max: 999999999,
        });
        const validCurrency = validateString(currency, "currency", {
          minLength: 3,
          maxLength: 3,
        });

        const id = Date.now().toString();
        const now = Date.now();
        const newBudget: Budget = {
          id,
          categoryId: validCategoryId,
          budget_limit: validAmount,
          period,
          currency: validCurrency,
          allowCarryover,
          lastCarryoverAmount: 0,
          lastPeriodEnd: 0,
          createdAt: now,
        };

        const db = await getDatabase();

        // Verify category exists
        const category = await db.getFirstAsync(
          "SELECT id FROM categories WHERE id = ?",
          [validCategoryId],
        );
        if (!category) {
          throw new Error("Category not found");
        }

        await db.runAsync(
          "INSERT INTO budgets (id, categoryId, budget_limit, period, currency, allowCarryover, lastCarryoverAmount, lastPeriodEnd, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            id,
            validCategoryId,
            validAmount,
            period,
            validCurrency,
            allowCarryover ? 1 : 0,
            0,
            0,
            now,
            now,
          ],
        );

        await loadBudgets();
        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("[v0] Widget update failed:", err));
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        const message =
          error instanceof Error ? error.message : "Failed to add budget";
        setError(message);
        throw error;
      }
    },
    [loadBudgets],
  );

  const updateBudget = useCallback(
    async (
      id: string,
      amount: number,
      period: "monthly" | "yearly",
      currency?: string,
    ) => {
      try {
        // Validate inputs
        const validId = validateId(id, "id");
        const validAmount = validateAmount(amount, "budget amount", {
          allowZero: false,
          allowNegative: false,
          max: 999999999,
        });
        const validCurrency = currency
          ? validateString(currency, "currency", {
              minLength: 3,
              maxLength: 3,
            })
          : undefined;

        const db = await getDatabase();
        if (validCurrency) {
          await db.runAsync(
            "UPDATE budgets SET budget_limit = ?, period = ?, currency = ?, updatedAt = ? WHERE id = ?",
            [validAmount, period, validCurrency, Date.now(), validId],
          );
        } else {
          await db.runAsync(
            "UPDATE budgets SET budget_limit = ?, period = ?, updatedAt = ? WHERE id = ?",
            [validAmount, period, Date.now(), validId],
          );
        }

        await loadBudgets();
        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("[v0] Widget update failed:", err));
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        const message =
          error instanceof Error ? error.message : "Failed to update budget";
        setError(message);
        throw error;
      }
    },
    [loadBudgets],
  );

  const setMonthlyBudget = useCallback(
    async (amount: number, currency: string = "USD") => {
      try {
        // Validate inputs
        const validAmount = validateAmount(amount, "monthly budget", {
          allowZero: false,
          allowNegative: false,
          max: 999999999,
        });
        const validCurrency = validateString(currency, "currency", {
          minLength: 3,
          maxLength: 3,
        });

        setError(null);
        const db = await getDatabase();
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const existing = await db.getFirstAsync<MonthlyBudget>(
          "SELECT * FROM monthly_budgets WHERE month = ? AND year = ? AND deletedAt IS NULL LIMIT 1",
          [month, year],
        );
        if (existing) {
          await db.runAsync(
            "UPDATE monthly_budgets SET amount = ?, currency = ?, updatedAt = ?, deletedAt = NULL WHERE id = ?",
            [validAmount, validCurrency, Date.now(), existing.id],
          );
        } else {
          await db.runAsync(
            "INSERT INTO monthly_budgets (id, amount, currency, month, year, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              Date.now().toString(),
              validAmount,
              validCurrency,
              month,
              year,
              Date.now(),
              Date.now(),
            ],
          );
        }
        await loadMonthlyBudget();
        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("[v0] Widget update failed:", err));
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to set monthly budget";
        setError(message);
        throw error;
      }
    },
    [loadMonthlyBudget],
  );

  const clearMonthlyBudget = useCallback(async () => {
    try {
      setError(null);
      const db = await getDatabase();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      await db.runAsync(
        "UPDATE monthly_budgets SET deletedAt = ?, updatedAt = ? WHERE month = ? AND year = ? AND deletedAt IS NULL",
        [Date.now(), Date.now(), month, year],
      );
      await loadMonthlyBudget();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to clear monthly budget";
      setError(message);
      throw err;
    }
  }, [loadMonthlyBudget]);

  const deleteBudget = useCallback(
    async (id: string) => {
      try {
        // Validate input
        const validId = validateId(id, "id");

        const db = await getDatabase();
        await db.runAsync(
          "UPDATE budgets SET deletedAt = ?, updatedAt = ? WHERE id = ?",
          [Date.now(), Date.now(), validId],
        );

        await loadBudgets();
        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("[v0] Widget update failed:", err));
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        const message =
          error instanceof Error ? error.message : "Failed to delete budget";
        setError(message);
        throw error;
      }
    },
    [loadBudgets],
  );

  const getBudget = useCallback(
    (id: string) => {
      return budgets.find((b) => b.id === id);
    },
    [budgets],
  );

  const getBudgetByCategory = useCallback(
    (categoryId: string) => {
      return budgets.find((b) => b.categoryId === categoryId);
    },
    [budgets],
  );

  const getBudgetsByCurrency = useCallback(
    (currency: string) => {
      return budgets.filter((b) => b.currency === currency);
    },
    [budgets],
  );

  const getAllBudgets = useCallback(() => {
    return budgets;
  }, [budgets]);

  const toggleBudgetCarryover = useCallback(
    async (id: string, enabled: boolean) => {
      const oldBudget = budgets.find((b) => b.id === id);
      if (!oldBudget) {
        throw new Error("Budget not found");
      }

      // Optimistic update
      const updatedBudget = { ...oldBudget, allowCarryover: enabled };
      setBudgets((prev) => prev.map((b) => (b.id === id ? updatedBudget : b)));
      setError(null);

      try {
        const db = await getDatabase();
        await db.runAsync(
          "UPDATE budgets SET allowCarryover = ?, updatedAt = ? WHERE id = ?",
          [enabled ? 1 : 0, Date.now(), id],
        );
      } catch (err) {
        // Rollback
        setBudgets((prev) => prev.map((b) => (b.id === id ? oldBudget : b)));
        const message =
          err instanceof Error ? err.message : "Failed to toggle carryover";
        setError(message);
        throw err;
      }
    },
    [budgets],
  );

  // Process period transitions and create snapshots
  // Handles multi-month gaps (e.g., app not opened for 3 months)
  const processPeriodTransitions = useCallback(async () => {
    const db = await getDatabase();

    try {
      // Start transaction for atomic period transitions
      await db.execAsync("BEGIN TRANSACTION");

      // Resolve settings from app settings (AsyncStorage) first, DB as fallback.
      // This keeps period transitions aligned with what users configure in UI.
      let periodStartDay = 1;
      let globalCarryoverEnabled = true;

      try {
        const storedSettingsRaw = await AsyncStorage.getItem(
          SETTINGS_STORAGE_KEY,
        );
        if (storedSettingsRaw) {
          const storedSettings = JSON.parse(storedSettingsRaw) as {
            budgetPeriodStartDay?: number;
            enableBudgetCarryover?: boolean;
          };
          if (
            typeof storedSettings.budgetPeriodStartDay === "number" &&
            storedSettings.budgetPeriodStartDay >= 1 &&
            storedSettings.budgetPeriodStartDay <= 28
          ) {
            periodStartDay = storedSettings.budgetPeriodStartDay;
          }
          if (typeof storedSettings.enableBudgetCarryover === "boolean") {
            globalCarryoverEnabled = storedSettings.enableBudgetCarryover;
          }
        } else {
          const settingsResult = await db.getFirstAsync<any>(
            "SELECT budgetPeriodStartDay, enableCarryover FROM budget_settings LIMIT 1",
          );
          periodStartDay = settingsResult?.budgetPeriodStartDay || 1;
          globalCarryoverEnabled = settingsResult?.enableCarryover !== 0;
        }
      } catch (settingsError) {
        console.warn("Falling back to default budget settings:", settingsError);
      }

      if (!globalCarryoverEnabled) {
        await db.execAsync("COMMIT");
        return; // Carryover disabled globally
      }

      const currentPeriod = getCurrentPeriod(periodStartDay);

      // Check each budget for period transition
      for (const budget of budgets) {
        if (!budget.allowCarryover || budget.period !== "monthly") {
          continue; // Skip if carryover disabled or not monthly
        }

        // Process ALL missed periods in a loop (handles multi-month gaps)
        let carryover = budget.lastCarryoverAmount;
        let lastEnd = budget.lastPeriodEnd;
        const MAX_CATCHUP = 12; // Safety limit
        let iterations = 0;

        while (
          needsPeriodTransition(lastEnd, periodStartDay) &&
          iterations < MAX_CATCHUP
        ) {
          iterations++;
          // Calculate which period just ended based on lastEnd
          // Go one day past lastEnd to land in the next period, then get previous
          const refDate = new Date(lastEnd + 86400000); // +1 day
          const endedPeriod = getPreviousPeriod(periodStartDay, refDate);
          const nextPeriod = getCurrentPeriod(periodStartDay, refDate);

          // Calculate spending for the ended period
          const transactions = await db.getAllAsync<any>(
            "SELECT amount FROM transactions WHERE categoryId = ? AND currency = ? AND type = 'expense' AND date >= ? AND date <= ? AND deletedAt IS NULL",
            [
              budget.categoryId,
              budget.currency,
              endedPeriod.start,
              endedPeriod.end,
            ],
          );

          const spent = transactions.reduce(
            (sum: number, t: any) => sum + t.amount,
            0,
          );
          carryover = budget.budget_limit + carryover - spent;

          // Create snapshot for the ended period
          await db.runAsync(
            "INSERT INTO budget_period_snapshots (id, budgetId, periodStart, periodEnd, budgetedAmount, carryoverIn, totalAvailable, spent, carryoverOut, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              `snap_${Date.now()}_${iterations}_${Math.random().toString(36).substring(2, 11)}`,
              budget.id,
              endedPeriod.start,
              endedPeriod.end,
              budget.budget_limit,
              carryover - (budget.budget_limit - spent), // carryoverIn for this period
              budget.budget_limit + (carryover - (budget.budget_limit - spent)),
              spent,
              carryover,
              Date.now(),
            ],
          );

          // Advance lastEnd to the end of the next period
          lastEnd = nextPeriod.end;
        }

        // Update budget with final carryover if any transitions occurred
        if (iterations > 0) {
          await db.runAsync(
            "UPDATE budgets SET lastCarryoverAmount = ?, lastPeriodEnd = ?, updatedAt = ? WHERE id = ?",
            [carryover, currentPeriod.end, Date.now(), budget.id],
          );
        }
      }

      // Commit the transaction
      await db.execAsync("COMMIT");

      // Reload budgets to get updated carryover amounts
      await loadBudgets();
    } catch (err) {
      // Rollback on error
      try {
        await db.execAsync("ROLLBACK");
      } catch (rollbackErr) {
        console.error("Error rolling back period transition:", rollbackErr);
      }
      console.error("Error processing period transitions:", err);
      throw err; // Re-throw to propagate error
    }
  }, [budgets, loadBudgets]);

  // Compute budgets with carryover information
  const budgetsWithCarryover = budgets.map(
    (budget): BudgetWithCarryover => ({
      ...budget,
      carryoverAmount: budget.lastCarryoverAmount,
      availableAmount: budget.budget_limit + budget.lastCarryoverAmount,
    }),
  );

  return (
    <BudgetContext.Provider
      value={{
        budgets,
        budgetsWithCarryover,
        monthlyBudget,
        loading,
        error,
        addBudget,
        updateBudget,
        toggleBudgetCarryover,
        setMonthlyBudget,
        clearMonthlyBudget,
        deleteBudget,
        getBudget,
        getBudgetByCategory,
        getBudgetsByCurrency,
        getAllBudgets,
        processPeriodTransitions,
        refreshBudgets: loadBudgets,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudgets() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error("useBudgets must be used within BudgetProvider");
  }
  return context;
}
