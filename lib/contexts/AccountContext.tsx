
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Account, getDatabase } from '../database';

interface AccountContextType {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  addAccount: (name: string, type: Account['type']) => Promise<void>;
  updateAccount: (id: string, name: string, balance: number) => Promise<void>;
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
      const result = await db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY createdAt DESC');
      setAccounts(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
      console.error('[v0] Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const addAccount = useCallback(async (name: string, type: Account['type']) => {
    try {
      setError(null);
      const id = Date.now().toString();
      const db = await getDatabase();
      await db.runAsync(
        'INSERT INTO accounts (id, name, type, balance, createdAt) VALUES (?, ?, ?, ?, ?)',
        [id, name, type, 0, Date.now()]
      );
      await loadAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add account';
      setError(message);
      throw err;
    }
  }, [loadAccounts]);

  const updateAccount = useCallback(async (id: string, name: string, balance: number) => {
    try {
      setError(null);
      const db = await getDatabase();
      await db.runAsync('UPDATE accounts SET name = ?, balance = ? WHERE id = ?', [name, balance, id]);
      await loadAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update account';
      setError(message);
      throw err;
    }
  }, [loadAccounts]);

  const deleteAccount = useCallback(async (id: string) => {
    try {
      setError(null);
      const db = await getDatabase();
      await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
      await loadAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      setError(message);
      throw err;
    }
  }, [loadAccounts]);

  const getAccount = useCallback((id: string) => {
    return accounts.find((a) => a.id === id);
  }, [accounts]);

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
    throw new Error('useAccounts must be used within AccountProvider');
  }
  return context;
}
