import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Account, getDatabase } from "../database";
import * as widgetService from "../services/WidgetService";

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
      const id = Date.now().toString();
      const newAccount: Account = {
        id,
        name,
        type,
        balance: 0,
        currency,
        createdAt: Date.now(),
      };

      // Optimistic update
      setAccounts((prev) => [newAccount, ...prev]);
      setError(null);

      try {
        const db = await getDatabase();
        await db.runAsync(
          "INSERT INTO accounts (id, name, type, balance, currency, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
          [id, name, type, 0, currency, Date.now()],
        );
        widgetService.updateAllWidgets().catch((err) => console.error('[v0] Widget update failed:', err));
      } catch (err) {
        // Rollback
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        const message =
          err instanceof Error ? err.message : "Failed to add account";
        setError(message);
        throw err;
      }
    },
    [],
  );

  const updateAccount = useCallback(
    async (id: string, name: string, balance: number, currency?: string) => {
      const oldAccount = accounts.find((a) => a.id === id);
      if (!oldAccount) {
        throw new Error("Account not found");
      }

      // Optimistic update
      const updatedAccount = {
        ...oldAccount,
        name,
        balance,
        ...(currency && { currency }),
      };
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? updatedAccount : a)),
      );
      setError(null);

      try {
        const db = await getDatabase();
        if (currency) {
          await db.runAsync(
            "UPDATE accounts SET name = ?, balance = ?, currency = ? WHERE id = ?",
            [name, balance, currency, id],
          );
        } else {
          await db.runAsync(
            "UPDATE accounts SET name = ?, balance = ? WHERE id = ?",
            [name, balance, id],
          );
        }
        widgetService.updateAllWidgets().catch((err) => console.error('[v0] Widget update failed:', err));
      } catch (err) {
        // Rollback
        setAccounts((prev) => prev.map((a) => (a.id === id ? oldAccount : a)));
        const message =
          err instanceof Error ? err.message : "Failed to update account";
        setError(message);
        throw err;
      }
    },
    [accounts],
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
        widgetService.updateAllWidgets().catch((err) => console.error('[v0] Widget update failed:', err));
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
