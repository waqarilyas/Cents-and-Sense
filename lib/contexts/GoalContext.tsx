import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Goal, getDatabase } from "../database";
import widgetService from "../services/WidgetService";
import {
  validateAmount,
  validateString,
  validateDate,
  validateId,
  ValidationError,
} from "../utils/validation";
import { Alert } from "react-native";

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
      try {
        // Validate inputs
        const validName = validateString(name, "goal name", {
          minLength: 1,
          maxLength: 100,
        });
        const validTargetAmount = validateAmount(
          targetAmount,
          "target amount",
          {
            allowZero: false,
            allowNegative: false,
            max: 999999999,
          },
        );
        const validDeadline = validateDate(deadline, "deadline");
        const validCurrency = validateString(currency, "currency", {
          minLength: 3,
          maxLength: 3,
        });

        const id = Date.now().toString();
        const newGoal: Goal = {
          id,
          name: validName,
          targetAmount: validTargetAmount,
          currentAmount: 0,
          deadline: validDeadline,
          currency: validCurrency,
          createdAt: Date.now(),
        };

        const db = await getDatabase();
        await db.runAsync(
          "INSERT INTO goals (id, name, targetAmount, currentAmount, deadline, currency, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            id,
            validName,
            validTargetAmount,
            0,
            validDeadline,
            validCurrency,
            Date.now(),
          ],
        );

        await loadGoals();
        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("[v0] Widget update failed:", err));
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        const message =
          error instanceof Error ? error.message : "Failed to add goal";
        setError(message);
        throw error;
      }
    },
    [loadGoals],
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
      try {
        // Validate inputs
        const validId = validateId(id, "id");
        const validName = validateString(name, "goal name", {
          minLength: 1,
          maxLength: 100,
        });
        const validTargetAmount = validateAmount(
          targetAmount,
          "target amount",
          {
            allowZero: false,
            allowNegative: false,
            max: 999999999,
          },
        );
        const validCurrentAmount = validateAmount(
          currentAmount,
          "current amount",
          {
            allowZero: true,
            allowNegative: false,
            max: 999999999,
          },
        );
        const validDeadline = validateDate(deadline, "deadline");
        const validCurrency = currency
          ? validateString(currency, "currency", {
              minLength: 3,
              maxLength: 3,
            })
          : undefined;

        const db = await getDatabase();
        if (validCurrency) {
          await db.runAsync(
            "UPDATE goals SET name = ?, targetAmount = ?, currentAmount = ?, deadline = ?, currency = ? WHERE id = ?",
            [
              validName,
              validTargetAmount,
              validCurrentAmount,
              validDeadline,
              validCurrency,
              validId,
            ],
          );
        } else {
          await db.runAsync(
            "UPDATE goals SET name = ?, targetAmount = ?, currentAmount = ?, deadline = ? WHERE id = ?",
            [
              validName,
              validTargetAmount,
              validCurrentAmount,
              validDeadline,
              validId,
            ],
          );
        }

        await loadGoals();
        await loadGoals();
        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("[v0] Widget update failed:", err));
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        const message =
          error instanceof Error ? error.message : "Failed to update goal";
        setError(message);
        throw error;
      }
    },
    [loadGoals],
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      try {
        // Validate input
        const validId = validateId(id, "id");

        const db = await getDatabase();
        await db.runAsync("DELETE FROM goals WHERE id = ?", [validId]);

        await loadGoals();
        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("[v0] Widget update failed:", err));
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        const message =
          error instanceof Error ? error.message : "Failed to delete goal";
        setError(message);
        throw error;
      }
    },
    [loadGoals],
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
        // Validate inputs
        const validId = validateId(id, "id");
        const validCurrentAmount = validateAmount(
          currentAmount,
          "current amount",
          {
            allowZero: true,
            allowNegative: false,
            max: 999999999,
          },
        );

        setError(null);
        const db = await getDatabase();
        await db.runAsync("UPDATE goals SET currentAmount = ? WHERE id = ?", [
          validCurrentAmount,
          validId,
        ]);
        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("[v0] Widget update failed:", err));
        await loadGoals();
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update goal progress";
        setError(message);
        throw error;
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
