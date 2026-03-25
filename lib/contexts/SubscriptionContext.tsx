import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { getDatabase, Subscription } from "../database";
import {
  validateAmount,
  validateString,
  validateDate,
  validateId,
  ValidationError,
} from "../utils/validation";
import { Alert } from "react-native";

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

// Calculate next due date based on frequency (handles month-end overflow)
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
    case "monthly": {
      // Preserve the original day-of-month to avoid drift (e.g. Jan 31 → Feb 28, not Mar 3)
      const originalDay = date.getDate();
      date.setDate(1); // go to 1st to avoid overflow
      date.setMonth(date.getMonth() + 1);
      // Clamp to the last day of the new month
      const lastDay = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
      ).getDate();
      date.setDate(Math.min(originalDay, lastDay));
      break;
    }
    case "yearly": {
      // Handle leap year: Feb 29 → Feb 28 in non-leap years
      const originalDay = date.getDate();
      const originalMonth = date.getMonth();
      date.setDate(1);
      date.setFullYear(date.getFullYear() + 1);
      date.setMonth(originalMonth);
      const lastDay = new Date(
        date.getFullYear(),
        originalMonth + 1,
        0,
      ).getDate();
      date.setDate(Math.min(originalDay, lastDay));
      break;
    }
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
        "SELECT * FROM subscriptions WHERE deletedAt IS NULL ORDER BY nextDueDate ASC",
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
      try {
        // Validate inputs
        const validName = validateString(name, "subscription name", {
          minLength: 1,
          maxLength: 100,
        });
        const validAmount = validateAmount(amount, "amount", {
          allowZero: false,
          allowNegative: false,
          max: 999999999,
        });
        const validCategoryId = validateId(categoryId, "categoryId");
        const validStartDate = validateDate(startDate, "start date");
        const validCurrency = validateString(currency, "currency", {
          minLength: 3,
          maxLength: 3,
        });
        const validReminderDays = validateAmount(
          reminderDays,
          "reminder days",
          {
            allowZero: true,
            allowNegative: false,
            max: 30,
          },
        );

        const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const now = Date.now();

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
          `INSERT INTO subscriptions (id, name, amount, currency, categoryId, frequency, startDate, nextDueDate, isActive, reminderDays, notes, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
          [
            id,
            validName,
            validAmount,
            validCurrency,
            validCategoryId,
            frequency,
            validStartDate,
            validStartDate,
            validReminderDays,
            notes || null,
            now,
            now,
          ],
        );

        await loadSubscriptions();
        return id;
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        throw error;
      }
    },
    [loadSubscriptions],
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

      // Validate provided fields
      if (updates.name !== undefined) {
        validateString(updates.name, "subscription name", {
          required: true,
          minLength: 1,
          maxLength: 100,
        });
      }
      if (updates.amount !== undefined) {
        validateAmount(updates.amount, "amount", {
          min: 0.01,
          max: 999999999,
        });
      }
      if (updates.categoryId !== undefined) {
        validateId(updates.categoryId, "categoryId");
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
        fields.push("updatedAt = ?");
        values.push(Date.now());

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
        await db.runAsync(
          "UPDATE subscriptions SET deletedAt = ?, updatedAt = ? WHERE id = ?",
          [Date.now(), Date.now(), id],
        );
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
        // Start transaction for atomic subscription processing
        await db.execAsync("BEGIN TRANSACTION");

        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // Find a matching account by currency, or fall back to first account
        const matchingAccount = await db.getFirstAsync<{ id: string }>(
          "SELECT id FROM accounts WHERE currency = ? LIMIT 1",
          [subscription.currency || "USD"],
        );
        const fallbackAccount = matchingAccount
          ? null
          : await db.getFirstAsync<{ id: string }>(
              "SELECT id FROM accounts ORDER BY createdAt ASC LIMIT 1",
            );
        const accountId = matchingAccount?.id || fallbackAccount?.id || null;

        // Create the transaction with currency and accountId
        await db.runAsync(
          `INSERT INTO transactions (id, accountId, categoryId, amount, currency, description, date, type, subscriptionId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'expense', ?, ?, ?)`,
          [
            transactionId,
            accountId,
            subscription.categoryId,
            subscription.amount,
            subscription.currency || "USD",
            subscription.name,
            subscription.nextDueDate,
            subscription.id,
            now,
            now,
          ],
        );

        // Update account balance if we have one
        if (accountId) {
          await db.runAsync(
            "UPDATE accounts SET balance = balance - ? WHERE id = ?",
            [subscription.amount, accountId],
          );
        }

        // Update the next due date
        const nextDue = calculateNextDueDate(
          subscription.nextDueDate,
          subscription.frequency,
        );
        await db.runAsync(
          "UPDATE subscriptions SET nextDueDate = ?, updatedAt = ? WHERE id = ?",
          [nextDue, Date.now(), subscription.id],
        );

        // Commit the transaction
        await db.execAsync("COMMIT");

        return true;
      } catch (error) {
        // Rollback on error
        try {
          await db.execAsync("ROLLBACK");
        } catch (rollbackErr) {
          console.error(
            "Error rolling back subscription processing:",
            rollbackErr,
          );
        }
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
        // Auto mode: Process all due subscriptions, catching up missed periods
        const db = await getDatabase();

        for (const subscription of dueSubscriptions) {
          // Process all missed periods in a loop (e.g., 3 months away → 3 transactions)
          let currentDueDate = subscription.nextDueDate;
          const MAX_CATCHUP = 12; // safety limit to prevent infinite loops
          let catchupCount = 0;

          while (currentDueDate <= now && catchupCount < MAX_CATCHUP) {
            catchupCount++;

            // Dedup: check if a transaction already exists for this subscription + due date
            const existing = await db.getFirstAsync<{ id: string }>(
              "SELECT id FROM transactions WHERE subscriptionId = ? AND date = ? AND deletedAt IS NULL LIMIT 1",
              [subscription.id, currentDueDate],
            );
            if (existing) {
              // Already processed, just advance the date
              currentDueDate = calculateNextDueDate(
                currentDueDate,
                subscription.frequency,
              );
              continue;
            }

            // Create a temporary subscription object with the right due date
            const subForProcessing = {
              ...subscription,
              nextDueDate: currentDueDate,
            };
            const success = await processSubscription(subForProcessing);
            if (success) {
              processedCount++;
            } else {
              break; // stop on error
            }

            currentDueDate = calculateNextDueDate(
              currentDueDate,
              subscription.frequency,
            );
          }

          // Make sure the DB next due date is up to date
          if (currentDueDate > subscription.nextDueDate) {
            await db.runAsync(
              "UPDATE subscriptions SET nextDueDate = ?, updatedAt = ? WHERE id = ?",
              [currentDueDate, Date.now(), subscription.id],
            );
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
          "UPDATE subscriptions SET nextDueDate = ?, updatedAt = ? WHERE id = ?",
          [nextDue, Date.now(), subscriptionId],
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
