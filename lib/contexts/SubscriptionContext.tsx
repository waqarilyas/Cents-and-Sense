import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { getDatabase, Subscription } from "../database";

// Pending subscription that needs user approval
export interface PendingSubscription {
  subscription: Subscription;
  dueDate: number;
}

interface SubscriptionContextType {
  subscriptions: Subscription[];
  activeSubscriptions: Subscription[];
  pendingSubscriptions: PendingSubscription[];
  loading: boolean;
  addSubscription: (
    name: string,
    amount: number,
    categoryId: string,
    frequency: "daily" | "weekly" | "monthly" | "yearly",
    startDate: number,
    currency: string,
    reminderDays?: number,
    notes?: string,
  ) => Promise<string>;
  updateSubscription: (
    id: string,
    updates: Partial<Omit<Subscription, "id" | "createdAt">>,
  ) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  toggleSubscription: (id: string) => Promise<void>;
  getSubscription: (id: string) => Subscription | undefined;
  processDueSubscriptions: (
    mode: "auto" | "manual" | "notify",
  ) => Promise<number>;
  approvePendingSubscription: (subscriptionId: string) => Promise<void>;
  skipPendingSubscription: (subscriptionId: string) => Promise<void>;
  approveAllPending: () => Promise<number>;
  clearPendingSubscriptions: () => void;
  getUpcomingSubscriptions: (days: number) => Subscription[];
  getDueSubscriptions: () => Subscription[];
  getMonthlyTotal: () => number;
  refreshSubscriptions: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
);

// Calculate next due date based on frequency
function calculateNextDueDate(
  currentDueDate: number,
  frequency: "daily" | "weekly" | "monthly" | "yearly",
): number {
  const date = new Date(currentDueDate);

  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.getTime();
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [pendingSubscriptions, setPendingSubscriptions] = useState<
    PendingSubscription[]
  >([]);
  const [loading, setLoading] = useState(true);

  const loadSubscriptions = useCallback(async () => {
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<Subscription>(
        "SELECT * FROM subscriptions ORDER BY nextDueDate ASC",
      );
      // Convert SQLite integers to booleans
      const parsed = result.map((s) => ({
        ...s,
        isActive: Boolean(s.isActive),
      }));
      setSubscriptions(parsed);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const activeSubscriptions = subscriptions.filter((s) => s.isActive);

  const addSubscription = useCallback(
    async (
      name: string,
      amount: number,
      categoryId: string,
      frequency: "daily" | "weekly" | "monthly" | "yearly",
      startDate: number,
      currency: string,
      reminderDays: number = 3,
      notes?: string,
    ): Promise<string> => {
      const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();
      const newSubscription: Subscription = {
        id,
        name,
        amount,
        currency,
        categoryId,
        frequency,
        startDate,
        nextDueDate: startDate,
        isActive: true,
        reminderDays,
        notes,
        createdAt: now,
      };

      // Optimistic update
      setSubscriptions((prev) => [...prev, newSubscription]);

      try {
        const db = await getDatabase();
        await db.runAsync(
          `INSERT INTO subscriptions (id, name, amount, currency, categoryId, frequency, startDate, nextDueDate, isActive, reminderDays, notes, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
          [
            id,
            name,
            amount,
            currency,
            categoryId,
            frequency,
            startDate,
            startDate,
            reminderDays,
            notes || null,
            now,
          ],
        );
        return id;
      } catch (err) {
        // Rollback
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
        throw err;
      }
    },
    [],
  );

  const updateSubscription = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Subscription, "id" | "createdAt">>,
    ) => {
      const oldSubscription = subscriptions.find((s) => s.id === id);
      if (!oldSubscription) {
        throw new Error("Subscription not found");
      }

      // Optimistic update
      const updatedSubscription = { ...oldSubscription, ...updates };
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === id ? updatedSubscription : s)),
      );

      try {
        const db = await getDatabase();
        const fields: string[] = [];
        const values: (string | number | null)[] = [];

        if (updates.name !== undefined) {
          fields.push("name = ?");
          values.push(updates.name);
        }
        if (updates.amount !== undefined) {
          fields.push("amount = ?");
          values.push(updates.amount);
        }
        if (updates.categoryId !== undefined) {
          fields.push("categoryId = ?");
          values.push(updates.categoryId);
        }
        if (updates.frequency !== undefined) {
          fields.push("frequency = ?");
          values.push(updates.frequency);
        }
        if (updates.startDate !== undefined) {
          fields.push("startDate = ?");
          values.push(updates.startDate);
        }
        if (updates.nextDueDate !== undefined) {
          fields.push("nextDueDate = ?");
          values.push(updates.nextDueDate);
        }
        if (updates.isActive !== undefined) {
          fields.push("isActive = ?");
          values.push(updates.isActive ? 1 : 0);
        }
        if (updates.reminderDays !== undefined) {
          fields.push("reminderDays = ?");
          values.push(updates.reminderDays);
        }
        if (updates.notes !== undefined) {
          fields.push("notes = ?");
          values.push(updates.notes || null);
        }

        if (fields.length > 0) {
          values.push(id);
          await db.runAsync(
            `UPDATE subscriptions SET ${fields.join(", ")} WHERE id = ?`,
            values,
          );
        }
      } catch (err) {
        // Rollback
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === id ? oldSubscription : s)),
        );
        throw err;
      }
    },
    [subscriptions],
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      // Optimistic update - remove from UI immediately
      const previousSubscriptions = [...subscriptions];
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));

      try {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM subscriptions WHERE id = ?", [id]);
      } catch (err) {
        // Rollback on error
        setSubscriptions(previousSubscriptions);
        throw err;
      }
    },
    [subscriptions],
  );

  const toggleSubscription = useCallback(
    async (id: string) => {
      const subscription = subscriptions.find((s) => s.id === id);
      if (subscription) {
        await updateSubscription(id, { isActive: !subscription.isActive });
      }
    },
    [subscriptions, updateSubscription],
  );

  const getSubscription = useCallback(
    (id: string) => subscriptions.find((s) => s.id === id),
    [subscriptions],
  );

  // Get subscriptions that are currently due
  const getDueSubscriptions = useCallback((): Subscription[] => {
    const now = Date.now();
    return activeSubscriptions.filter((s) => s.nextDueDate <= now);
  }, [activeSubscriptions]);

  // Process a single subscription - creates transaction and updates next due date
  const processSubscription = useCallback(
    async (subscription: Subscription): Promise<boolean> => {
      const db = await getDatabase();
      const now = Date.now();

      try {
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create the transaction with currency
        await db.runAsync(
          `INSERT INTO transactions (id, categoryId, amount, currency, description, date, type, subscriptionId, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, 'expense', ?, ?)`,
          [
            transactionId,
            subscription.categoryId,
            subscription.amount,
            subscription.currency || "USD",
            subscription.name,
            subscription.nextDueDate,
            subscription.id,
            now,
          ],
        );

        // Update the next due date
        const nextDue = calculateNextDueDate(
          subscription.nextDueDate,
          subscription.frequency,
        );
        await db.runAsync(
          "UPDATE subscriptions SET nextDueDate = ? WHERE id = ?",
          [nextDue, subscription.id],
        );

        return true;
      } catch (error) {
        console.error(
          `Error processing subscription ${subscription.name}:`,
          error,
        );
        return false;
      }
    },
    [],
  );

  // Process subscriptions based on mode
  const processDueSubscriptions = useCallback(
    async (mode: "auto" | "manual" | "notify"): Promise<number> => {
      const now = Date.now();
      let processedCount = 0;

      // Get all active subscriptions that are due
      const dueSubscriptions = activeSubscriptions.filter(
        (s) => s.nextDueDate <= now,
      );

      if (dueSubscriptions.length === 0) {
        return 0;
      }

      if (mode === "auto") {
        // Auto mode: Process all due subscriptions immediately
        for (const subscription of dueSubscriptions) {
          const success = await processSubscription(subscription);
          if (success) {
            processedCount++;
          }
        }

        if (processedCount > 0) {
          await loadSubscriptions();
        }
      } else if (mode === "notify" || mode === "manual") {
        // Notify/Manual mode: Add to pending list for user approval
        const newPending: PendingSubscription[] = dueSubscriptions
          .filter(
            (sub) =>
              !pendingSubscriptions.some((p) => p.subscription.id === sub.id),
          )
          .map((subscription) => ({
            subscription,
            dueDate: subscription.nextDueDate,
          }));

        if (newPending.length > 0) {
          setPendingSubscriptions((prev) => [...prev, ...newPending]);
        }
      }

      return processedCount;
    },
    [
      activeSubscriptions,
      processSubscription,
      loadSubscriptions,
      pendingSubscriptions,
    ],
  );

  // Approve a single pending subscription
  const approvePendingSubscription = useCallback(
    async (subscriptionId: string): Promise<void> => {
      const pending = pendingSubscriptions.find(
        (p) => p.subscription.id === subscriptionId,
      );

      if (pending) {
        const success = await processSubscription(pending.subscription);
        if (success) {
          setPendingSubscriptions((prev) =>
            prev.filter((p) => p.subscription.id !== subscriptionId),
          );
          await loadSubscriptions();
        }
      }
    },
    [pendingSubscriptions, processSubscription, loadSubscriptions],
  );

  // Skip a pending subscription (just remove from pending, update next due date)
  const skipPendingSubscription = useCallback(
    async (subscriptionId: string): Promise<void> => {
      const pending = pendingSubscriptions.find(
        (p) => p.subscription.id === subscriptionId,
      );

      if (pending) {
        const db = await getDatabase();
        // Update the next due date without creating a transaction
        const nextDue = calculateNextDueDate(
          pending.subscription.nextDueDate,
          pending.subscription.frequency,
        );
        await db.runAsync(
          "UPDATE subscriptions SET nextDueDate = ? WHERE id = ?",
          [nextDue, subscriptionId],
        );

        setPendingSubscriptions((prev) =>
          prev.filter((p) => p.subscription.id !== subscriptionId),
        );
        await loadSubscriptions();
      }
    },
    [pendingSubscriptions, loadSubscriptions],
  );

  // Approve all pending subscriptions
  const approveAllPending = useCallback(async (): Promise<number> => {
    let count = 0;
    for (const pending of pendingSubscriptions) {
      const success = await processSubscription(pending.subscription);
      if (success) {
        count++;
      }
    }

    if (count > 0) {
      setPendingSubscriptions([]);
      await loadSubscriptions();
    }

    return count;
  }, [pendingSubscriptions, processSubscription, loadSubscriptions]);

  // Clear all pending subscriptions without processing
  const clearPendingSubscriptions = useCallback(() => {
    setPendingSubscriptions([]);
  }, []);

  // Get subscriptions coming up in the next N days
  const getUpcomingSubscriptions = useCallback(
    (days: number): Subscription[] => {
      const now = Date.now();
      const futureDate = now + days * 24 * 60 * 60 * 1000;

      return activeSubscriptions.filter(
        (s) => s.nextDueDate > now && s.nextDueDate <= futureDate,
      );
    },
    [activeSubscriptions],
  );

  // Calculate total monthly cost of all active subscriptions
  const getMonthlyTotal = useCallback((): number => {
    return activeSubscriptions.reduce((total, sub) => {
      switch (sub.frequency) {
        case "daily":
          return total + sub.amount * 30;
        case "weekly":
          return total + sub.amount * 4.33;
        case "monthly":
          return total + sub.amount;
        case "yearly":
          return total + sub.amount / 12;
        default:
          return total;
      }
    }, 0);
  }, [activeSubscriptions]);

  const refreshSubscriptions = useCallback(async () => {
    await loadSubscriptions();
  }, [loadSubscriptions]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        activeSubscriptions,
        pendingSubscriptions,
        loading,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        toggleSubscription,
        getSubscription,
        processDueSubscriptions,
        approvePendingSubscription,
        skipPendingSubscription,
        approveAllPending,
        clearPendingSubscriptions,
        getUpcomingSubscriptions,
        getDueSubscriptions,
        getMonthlyTotal,
        refreshSubscriptions,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptions() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscriptions must be used within a SubscriptionProvider",
    );
  }
  return context;
}
