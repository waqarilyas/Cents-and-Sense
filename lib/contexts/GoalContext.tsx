import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Goal, getDatabase } from "../database";

interface GoalContextType {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  addGoal: (
    name: string,
    targetAmount: number,
    deadline: number,
    currency: string,
  ) => Promise<void>;
  updateGoal: (
    id: string,
    name: string,
    targetAmount: number,
    currentAmount: number,
    deadline: number,
    currency?: string,
  ) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  getGoal: (id: string) => Goal | undefined;
  updateGoalProgress: (id: string, currentAmount: number) => Promise<void>;
  getAllGoals: () => Goal[];
}

const GoalContext = createContext<GoalContextType | undefined>(undefined);

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = await getDatabase();
      const result = await db.getAllAsync<Goal>(
        "SELECT * FROM goals ORDER BY deadline ASC, createdAt DESC",
      );
      setGoals(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
      console.error("[v0] Error loading goals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const addGoal = useCallback(
    async (
      name: string,
      targetAmount: number,
      deadline: number,
      currency: string = "USD",
    ) => {
      const id = Date.now().toString();
      const newGoal: Goal = {
        id,
        name,
        targetAmount,
        currentAmount: 0,
        deadline,
        currency,
        createdAt: Date.now(),
      };

      // Optimistic update
      setGoals((prev) => [...prev, newGoal]);
      setError(null);

      try {
        const db = await getDatabase();
        await db.runAsync(
          "INSERT INTO goals (id, name, targetAmount, currentAmount, deadline, currency, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [id, name, targetAmount, 0, deadline, currency, Date.now()],
        );
      } catch (err) {
        // Rollback
        setGoals((prev) => prev.filter((g) => g.id !== id));
        const message =
          err instanceof Error ? err.message : "Failed to add goal";
        setError(message);
        throw err;
      }
    },
    [],
  );

  const updateGoal = useCallback(
    async (
      id: string,
      name: string,
      targetAmount: number,
      currentAmount: number,
      deadline: number,
      currency?: string,
    ) => {
      const oldGoal = goals.find((g) => g.id === id);
      if (!oldGoal) {
        throw new Error("Goal not found");
      }

      // Optimistic update
      const updatedGoal = {
        ...oldGoal,
        name,
        targetAmount,
        currentAmount,
        deadline,
        ...(currency && { currency }),
      };
      setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));
      setError(null);

      try {
        const db = await getDatabase();
        if (currency) {
          await db.runAsync(
            "UPDATE goals SET name = ?, targetAmount = ?, currentAmount = ?, deadline = ?, currency = ? WHERE id = ?",
            [name, targetAmount, currentAmount, deadline, currency, id],
          );
        } else {
          await db.runAsync(
            "UPDATE goals SET name = ?, targetAmount = ?, currentAmount = ?, deadline = ? WHERE id = ?",
            [name, targetAmount, currentAmount, deadline, id],
          );
        }
      } catch (err) {
        // Rollback
        setGoals((prev) => prev.map((g) => (g.id === id ? oldGoal : g)));
        const message =
          err instanceof Error ? err.message : "Failed to update goal";
        setError(message);
        throw err;
      }
    },
    [goals],
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      // Optimistic update - remove from UI immediately
      const previousGoals = [...goals];
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setError(null);

      try {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM goals WHERE id = ?", [id]);
      } catch (err) {
        // Rollback on error
        setGoals(previousGoals);
        const message =
          err instanceof Error ? err.message : "Failed to delete goal";
        setError(message);
        throw err;
      }
    },
    [goals],
  );

  const getGoal = useCallback(
    (id: string) => {
      return goals.find((g) => g.id === id);
    },
    [goals],
  );

  const updateGoalProgress = useCallback(
    async (id: string, currentAmount: number) => {
      try {
        setError(null);
        const db = await getDatabase();
        await db.runAsync("UPDATE goals SET currentAmount = ? WHERE id = ?", [
          currentAmount,
          id,
        ]);
        await loadGoals();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update goal progress";
        setError(message);
        throw err;
      }
    },
    [loadGoals],
  );

  const getAllGoals = useCallback(() => {
    return goals;
  }, [goals]);

  return (
    <GoalContext.Provider
      value={{
        goals,
        loading,
        error,
        addGoal,
        updateGoal,
        deleteGoal,
        getGoal,
        updateGoalProgress,
        getAllGoals,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalContext);
  if (context === undefined) {
    throw new Error("useGoals must be used within GoalProvider");
  }
  return context;
}
