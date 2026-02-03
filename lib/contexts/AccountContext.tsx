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
  getAccount: (id: string) => Account | undefined;
  getTotalBalance: () => number;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = await getDatabase();
      const result = await db.getAllAsync<Account>(
        "SELECT * FROM accounts ORDER BY createdAt DESC",
      );
      setAccounts(result || []);
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

        const id = `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const db = await getDatabase();

        await db.runAsync(
          "INSERT INTO accounts (id, name, type, balance, currency, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
          [id, validName, validType, 0, validCurrency, Date.now()],
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

      // Optimistic update - remove from UI immediately
      const previousAccounts = [...accounts];
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setError(null);

      try {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM accounts WHERE id = ?", [id]);
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
        loading,
        error,
        addAccount,
        updateAccount,
        deleteAccount,
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
