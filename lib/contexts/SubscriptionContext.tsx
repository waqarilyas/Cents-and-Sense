import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { getDatabase, Subscription } from "../database";

interface SubscriptionContextType {
  subscriptions: Subscription[];
  activeSubscriptions: Subscription[];
  loading: boolean;
  addSubscription: (
    name: string,
    amount: number,
    categoryId: string,
    frequency: "daily" | "weekly" | "monthly" | "yearly",
    startDate: number,
    reminderDays?: number,
    notes?: string
  ) => Promise<string>;
  updateSubscription: (
    id: string,
    updates: Partial<Omit<Subscription, "id" | "createdAt">>
  ) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  toggleSubscription: (id: string) => Promise<void>;
  getSubscription: (id: string) => Subscription | undefined;
  processDueSubscriptions: () => Promise<number>;
  getUpcomingSubscriptions: (days: number) => Subscription[];
  getMonthlyTotal: () => number;
  refreshSubscriptions: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Calculate next due date based on frequency
function calculateNextDueDate(
  currentDueDate: number,
  frequency: "daily" | "weekly" | "monthly" | "yearly"
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
  const [loading, setLoading] = useState(true);

  const loadSubscriptions = useCallback(async () => {
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<Subscription>(
        "SELECT * FROM subscriptions ORDER BY nextDueDate ASC"
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
      reminderDays: number = 3,
      notes?: string
    ): Promise<string> => {
      const db = await getDatabase();
      const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();

      await db.runAsync(
        `INSERT INTO subscriptions (id, name, amount, categoryId, frequency, startDate, nextDueDate, isActive, reminderDays, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [id, name, amount, categoryId, frequency, startDate, startDate, reminderDays, notes || null, now]
      );

      await loadSubscriptions();
      return id;
    },
    [loadSubscriptions]
  );

  const updateSubscription = useCallback(
    async (id: string, updates: Partial<Omit<Subscription, "id" | "createdAt">>) => {
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
          values
        );
        await loadSubscriptions();
      }
    },
    [loadSubscriptions]
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      const db = await getDatabase();
      await db.runAsync("DELETE FROM subscriptions WHERE id = ?", [id]);
      await loadSubscriptions();
    },
    [loadSubscriptions]
  );

  const toggleSubscription = useCallback(
    async (id: string) => {
      const subscription = subscriptions.find((s) => s.id === id);
      if (subscription) {
        await updateSubscription(id, { isActive: !subscription.isActive });
      }
    },
    [subscriptions, updateSubscription]
  );

  const getSubscription = useCallback(
    (id: string) => subscriptions.find((s) => s.id === id),
    [subscriptions]
  );

  // Process subscriptions that are due and create transactions
  const processDueSubscriptions = useCallback(async (): Promise<number> => {
    const db = await getDatabase();
    const now = Date.now();
    let processedCount = 0;

    // Get all active subscriptions that are due
    const dueSubscriptions = activeSubscriptions.filter(
      (s) => s.nextDueDate <= now
    );

    for (const subscription of dueSubscriptions) {
      try {
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create the transaction
        await db.runAsync(
          `INSERT INTO transactions (id, categoryId, amount, description, date, type, subscriptionId, createdAt)
           VALUES (?, ?, ?, ?, ?, 'expense', ?, ?)`,
          [
            transactionId,
            subscription.categoryId,
            subscription.amount,
            subscription.name,
            subscription.nextDueDate,
            subscription.id,
            now,
          ]
        );

        // Update the next due date
        const nextDue = calculateNextDueDate(subscription.nextDueDate, subscription.frequency);
        await db.runAsync(
          "UPDATE subscriptions SET nextDueDate = ? WHERE id = ?",
          [nextDue, subscription.id]
        );

        processedCount++;
      } catch (error) {
        console.error(`Error processing subscription ${subscription.name}:`, error);
      }
    }

    if (processedCount > 0) {
      await loadSubscriptions();
    }

    return processedCount;
  }, [activeSubscriptions, loadSubscriptions]);

  // Get subscriptions coming up in the next N days
  const getUpcomingSubscriptions = useCallback(
    (days: number): Subscription[] => {
      const now = Date.now();
      const futureDate = now + days * 24 * 60 * 60 * 1000;
      
      return activeSubscriptions.filter(
        (s) => s.nextDueDate > now && s.nextDueDate <= futureDate
      );
    },
    [activeSubscriptions]
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
        loading,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        toggleSubscription,
        getSubscription,
        processDueSubscriptions,
        getUpcomingSubscriptions,
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
    throw new Error("useSubscriptions must be used within a SubscriptionProvider");
  }
  return context;
}
