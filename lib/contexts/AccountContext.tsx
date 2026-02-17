import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";
import { Account, getDatabase } from "../database";
import widgetService from "../services/WidgetService";
import {
  validateString,
  validateAmount,
  validateId,
  validateAccountType,
  ValidationError,
} from "../utils/validation";

interface AccountContextType {
  accounts: Account[];
  defaultAccount: Account | null;
  loading: boolean;
  error: string | null;
  addAccount: (
    name: string,
    type: Account["type"],
    currency?: string,
  ) => Promise<void>;
  updateAccount: (
    id: string,
    name: string,
    balance: number,
    currency?: string,
  ) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  setDefaultAccount: (id: string) => Promise<void>;
  getAccount: (id: string) => Account | undefined;
  getTotalBalance: () => number;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive default account from accounts list
  const defaultAccount = React.useMemo(() => {
    const explicit = accounts.find((a) => a.isDefault);
    if (explicit) return explicit;
    // Fallback: if only one account, treat it as default
    if (accounts.length === 1) return accounts[0];
    return null;
  }, [accounts]);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = await getDatabase();
      const result = await db.getAllAsync<any>(
        "SELECT * FROM accounts ORDER BY createdAt DESC",
      );
      // Map isDefault from integer to boolean
      const mapped: Account[] = (result || []).map((r: any) => ({
        ...r,
        isDefault: !!r.isDefault,
      }));
      setAccounts(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
      console.error("[v0] Error loading accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const addAccount = useCallback(
    async (name: string, type: Account["type"], currency: string = "USD") => {
      try {
        // Validate inputs
        const validName = validateString(name, "name", {
          required: true,
          minLength: 1,
          maxLength: 100,
        });
        const validType = validateAccountType(type);
        const validCurrency = validateString(currency, "currency", {
          required: true,
          minLength: 3,
          maxLength: 3,
        });

        const id = `account_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const db = await getDatabase();

        // Auto-set as default if this is the first account or no default exists
        const existingDefault = await db.getFirstAsync<any>(
          "SELECT id FROM accounts WHERE isDefault = 1 LIMIT 1",
        );
        const shouldBeDefault = !existingDefault ? 1 : 0;

        await db.runAsync(
          "INSERT INTO accounts (id, name, type, balance, currency, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            id,
            validName,
            validType,
            0,
            validCurrency,
            shouldBeDefault,
            Date.now(),
          ],
        );

        await loadAccounts();
        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("Widget update failed:", err));
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
          throw error;
        }
        const message =
          error instanceof Error ? error.message : "Failed to add account";
        setError(message);
        throw error;
      }
    },
    [loadAccounts],
  );

  const updateAccount = useCallback(
    async (id: string, name: string, balance: number, currency?: string) => {
      try {
        // Validate inputs
        const validId = validateId(id, "id");
        const validName = validateString(name, "name", {
          required: true,
          minLength: 1,
          maxLength: 100,
        });
        const validBalance = validateAmount(balance, "balance", {
          allowNegative: true, // Allow negative for credit cards
          max: 999999999,
        });
        const validCurrency = currency
          ? validateString(currency, "currency", {
              required: true,
              minLength: 3,
              maxLength: 3,
            })
          : undefined;

        const db = await getDatabase();

        if (validCurrency) {
          await db.runAsync(
            "UPDATE accounts SET name = ?, balance = ?, currency = ? WHERE id = ?",
            [validName, validBalance, validCurrency, validId],
          );
        } else {
          await db.runAsync(
            "UPDATE accounts SET name = ?, balance = ? WHERE id = ?",
            [validName, validBalance, validId],
          );
        }

        await loadAccounts();
        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("Widget update failed:", err));
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
          throw error;
        }
        const message =
          error instanceof Error ? error.message : "Failed to update account";
        setError(message);
        throw error;
      }
    },
    [loadAccounts],
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      // Prevent deleting the last account
      if (accounts.length <= 1) {
        throw new Error(
          "Cannot delete the last account. You must have at least one account.",
        );
      }

      const deletedAccount = accounts.find((a) => a.id === id);

      // Optimistic update - remove from UI immediately
      const previousAccounts = [...accounts];
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setError(null);

      try {
        const db = await getDatabase();

        // Use a transaction to ensure atomicity
        await db.execAsync("BEGIN TRANSACTION");
        try {
          // Delete associated transactions first
          await db.runAsync("DELETE FROM transactions WHERE accountId = ?", [
            id,
          ]);
          // Then delete the account
          await db.runAsync("DELETE FROM accounts WHERE id = ?", [id]);

          // If the deleted account was the default, reassign to the first remaining account
          if (deletedAccount?.isDefault) {
            const remaining = accounts.filter((a) => a.id !== id);
            if (remaining.length > 0) {
              await db.runAsync(
                "UPDATE accounts SET isDefault = 1 WHERE id = ?",
                [remaining[0].id],
              );
            }
          }

          await db.execAsync("COMMIT");
        } catch (txErr) {
          await db.execAsync("ROLLBACK");
          throw txErr;
        }

        await loadAccounts(); // Reload to reflect changes

        widgetService
          .updateAllWidgets()
          .catch((err) => console.error("[v0] Widget update failed:", err));
      } catch (err) {
        // Rollback on error
        setAccounts(previousAccounts);
        const message =
          err instanceof Error ? err.message : "Failed to delete account";
        setError(message);
        throw err;
      }
    },
    [accounts, loadAccounts],
  );

  const setDefaultAccount = useCallback(
    async (id: string) => {
      const previousAccounts = [...accounts];
      // Optimistic update
      setAccounts((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === id,
        })),
      );

      try {
        const db = await getDatabase();
        // Use a transaction to prevent a state with no default
        await db.execAsync("BEGIN TRANSACTION");
        try {
          await db.runAsync("UPDATE accounts SET isDefault = 0");
          await db.runAsync("UPDATE accounts SET isDefault = 1 WHERE id = ?", [
            id,
          ]);
          await db.execAsync("COMMIT");
        } catch (txErr) {
          await db.execAsync("ROLLBACK");
          throw txErr;
        }
      } catch (err) {
        // Rollback on error
        setAccounts(previousAccounts);
        const message =
          err instanceof Error ? err.message : "Failed to set default account";
        setError(message);
        throw err;
      }
    },
    [accounts],
  );

  const getAccount = useCallback(
    (id: string) => {
      return accounts.find((a) => a.id === id);
    },
    [accounts],
  );

  const getTotalBalance = useCallback(() => {
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  }, [accounts]);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        defaultAccount,
        loading,
        error,
        addAccount,
        updateAccount,
        deleteAccount,
        setDefaultAccount,
        getAccount,
        getTotalBalance,
        refreshAccounts: loadAccounts,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccounts must be used within AccountProvider");
  }
  return context;
}
