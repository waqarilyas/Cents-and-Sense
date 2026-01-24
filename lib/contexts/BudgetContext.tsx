import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Budget, MonthlyBudget, getDatabase } from "../database";

interface BudgetContextType {
  budgets: Budget[];
  monthlyBudget: MonthlyBudget | null;
  loading: boolean;
  error: string | null;
  addBudget: (
    categoryId: string,
    amount: number,
    period: "monthly" | "yearly",
    currency?: string,
  ) => Promise<void>;
  updateBudget: (
    id: string,
    amount: number,
    period: "monthly" | "yearly",
    currency?: string,
  ) => Promise<void>;
  setMonthlyBudget: (amount: number, currency?: string) => Promise<void>;
  clearMonthlyBudget: () => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  getBudget: (id: string) => Budget | undefined;
  getBudgetByCategory: (categoryId: string) => Budget | undefined;
  getAllBudgets: () => Budget[];
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
        "SELECT * FROM budgets ORDER BY createdAt DESC",
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
        "SELECT * FROM monthly_budgets WHERE month = ? AND year = ? LIMIT 1",
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
    ) => {
      try {
        setError(null);
        const id = Date.now().toString();
        const db = await getDatabase();
        await db.runAsync(
          "INSERT INTO budgets (id, categoryId, budget_limit, period, currency, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
          [id, categoryId, amount, period, currency, Date.now()],
        );
        await loadBudgets();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add budget";
        setError(message);
        throw err;
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
        setError(null);
        const db = await getDatabase();
        if (currency) {
          await db.runAsync(
            "UPDATE budgets SET budget_limit = ?, period = ?, currency = ? WHERE id = ?",
            [amount, period, currency, id],
          );
        } else {
          await db.runAsync(
            "UPDATE budgets SET budget_limit = ?, period = ? WHERE id = ?",
            [amount, period, id],
          );
        }
        await loadBudgets();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update budget";
        setError(message);
        throw err;
      }
    },
    [loadBudgets],
  );

  const setMonthlyBudget = useCallback(
    async (amount: number, currency: string = "USD") => {
      try {
        setError(null);
        const db = await getDatabase();
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const existing = await db.getFirstAsync<MonthlyBudget>(
          "SELECT * FROM monthly_budgets WHERE month = ? AND year = ? LIMIT 1",
          [month, year],
        );
        if (existing) {
          await db.runAsync(
            "UPDATE monthly_budgets SET amount = ?, currency = ? WHERE id = ?",
            [amount, currency, existing.id],
          );
        } else {
          await db.runAsync(
            "INSERT INTO monthly_budgets (id, amount, currency, month, year, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
            [Date.now().toString(), amount, currency, month, year, Date.now()],
          );
        }
        await loadMonthlyBudget();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to set monthly budget";
        setError(message);
        throw err;
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
        "DELETE FROM monthly_budgets WHERE month = ? AND year = ?",
        [month, year],
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
        setError(null);
        const db = await getDatabase();
        await db.runAsync("DELETE FROM budgets WHERE id = ?", [id]);
        await loadBudgets();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete budget";
        setError(message);
        throw err;
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

  const getAllBudgets = useCallback(() => {
    return budgets;
  }, [budgets]);

  return (
    <BudgetContext.Provider
      value={{
        budgets,
        monthlyBudget,
        loading,
        error,
        addBudget,
        updateBudget,
        setMonthlyBudget,
        clearMonthlyBudget,
        deleteBudget,
        getBudget,
        getBudgetByCategory,
        getAllBudgets,
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
