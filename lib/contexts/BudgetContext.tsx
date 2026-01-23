import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Budget, getDatabase } from "../database";

interface BudgetContextType {
  budgets: Budget[];
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
  deleteBudget: (id: string) => Promise<void>;
  getBudget: (id: string) => Budget | undefined;
  getBudgetByCategory: (categoryId: string) => Budget | undefined;
  getAllBudgets: () => Budget[];
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
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

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

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
        loading,
        error,
        addBudget,
        updateBudget,
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
