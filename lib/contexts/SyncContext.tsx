import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getDatabase } from "../database";
import { supabaseService } from "../services/SupabaseService";
import { useAuth } from "./AuthContext";
import { useEntitlements } from "./EntitlementContext";

type SyncStatus = "idle" | "syncing" | "error" | "success";

interface SyncContextType {
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  syncError: string | null;
  syncNow: () => Promise<void>;
  backupNow: () => Promise<void>;
  restoreFromCloud: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const SYNC_TABLES = [
  "accounts",
  "categories",
  "transactions",
  "budgets",
  "monthly_budgets",
  "goals",
  "subscriptions",
  "user_profile",
] as const;

type SyncTable = (typeof SYNC_TABLES)[number];

function tableNameToStateKey(table: string): string {
  return `sync_${table}_lastPulledAt`;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { authState, userId } = useAuth();
  const { isPremium } = useEntitlements();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const requireSyncEligibility = useCallback(() => {
    if (!isPremium) {
      throw new Error("Cloud sync is a premium feature");
    }
    if (authState === "guest" || !userId) {
      throw new Error("Please log in to sync across devices");
    }
  }, [isPremium, authState, userId]);

  const getTableColumns = useCallback(async (table: string): Promise<string[]> => {
    const db = await getDatabase();
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    return cols.map((c) => c.name);
  }, []);

  const claimGuestRowsForUser = useCallback(
    async (table: string, targetUserId: string) => {
      const db = await getDatabase();
      const cols = await getTableColumns(table);
      if (!cols.includes("userId")) return;
      await db.runAsync(
        `UPDATE ${table} SET userId = ?, updatedAt = COALESCE(updatedAt, createdAt, ?) WHERE userId IS NULL`,
        [targetUserId, Date.now()],
      );
    },
    [getTableColumns],
  );

  const upsertLocalRows = useCallback(
    async (table: string, rows: Record<string, any>[]) => {
      if (!rows.length) return;
      const db = await getDatabase();
      const tableColumns = await getTableColumns(table);

      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => tableColumns.includes(k));
        if (!keys.includes("id")) continue;

        const placeholders = keys.map(() => "?").join(", ");
        const updateSet = keys
          .filter((k) => k !== "id")
          .map((k) => `${k} = excluded.${k}`)
          .join(", ");

        const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSet} WHERE excluded.updatedAt >= ${table}.updatedAt`;
        const values = keys.map((k) => row[k]);
        await db.runAsync(sql, values);
      }
    },
    [getTableColumns],
  );

  const syncNow = useCallback(async () => {
    requireSyncEligibility();

    setSyncStatus("syncing");
    setSyncError(null);

    try {
      const db = await getDatabase();
      const isSupabaseReady = await supabaseService.isConfigured();
      if (!isSupabaseReady) {
        throw new Error(
          "Supabase is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.",
        );
      }
      const session = await supabaseService.getSession();
      if (!session?.access_token || !userId) {
        throw new Error("No authenticated session found");
      }
      await supabaseService.verifySyncSchema(session.access_token);

      for (const table of SYNC_TABLES) {
        await claimGuestRowsForUser(table, userId);

        const localRows = await db.getAllAsync<any>(
          `SELECT * FROM ${table} WHERE (userId IS NULL OR userId = ?)` ,
          [userId],
        );

        const rowsForCloud = localRows.map((r) => ({
          ...r,
          userId,
          updatedAt: r.updatedAt || r.createdAt || Date.now(),
        }));

        await supabaseService.upsertRows(table, rowsForCloud, session.access_token);

        const stateKey = tableNameToStateKey(table);
        const pulledAtResult = await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM sync_state WHERE key = ? LIMIT 1",
          [stateKey],
        );
        const since = Number(pulledAtResult?.value || 0);

        const remoteRows = await supabaseService.pullRows(
          table,
          userId,
          since,
          session.access_token,
        );

        await upsertLocalRows(table, remoteRows);
        const maxPulledUpdatedAt =
          remoteRows.length > 0
            ? Math.max(...remoteRows.map((row) => Number(row.updatedAt || 0)))
            : since;

        await db.runAsync(
          "INSERT INTO sync_state (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt",
          [stateKey, String(maxPulledUpdatedAt), Date.now()],
        );
      }

      setLastSyncAt(Date.now());
      setSyncStatus("success");
    } catch (error) {
      setSyncStatus("error");
      setSyncError(error instanceof Error ? error.message : "Sync failed");
      throw error;
    }
  }, [claimGuestRowsForUser, requireSyncEligibility, upsertLocalRows, userId]);

  const backupNow = useCallback(async () => {
    await syncNow();
  }, [syncNow]);

  const restoreFromCloud = useCallback(async () => {
    requireSyncEligibility();

    setSyncStatus("syncing");
    setSyncError(null);

    try {
      const db = await getDatabase();
      const isSupabaseReady = await supabaseService.isConfigured();
      if (!isSupabaseReady) {
        throw new Error(
          "Supabase is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.",
        );
      }
      const session = await supabaseService.getSession();
      if (!session?.access_token || !userId) {
        throw new Error("No authenticated session found");
      }
      await supabaseService.verifySyncSchema(session.access_token);

      for (const table of SYNC_TABLES) {
        const remoteRows = await supabaseService.pullRows(
          table,
          userId,
          0,
          session.access_token,
        );
        await upsertLocalRows(table, remoteRows);
      }

      setLastSyncAt(Date.now());
      setSyncStatus("success");
    } catch (error) {
      setSyncStatus("error");
      setSyncError(error instanceof Error ? error.message : "Restore failed");
      throw error;
    }
  }, [requireSyncEligibility, upsertLocalRows, userId]);

  const value = useMemo(
    () => ({ syncStatus, lastSyncAt, syncError, syncNow, backupNow, restoreFromCloud }),
    [syncStatus, lastSyncAt, syncError, syncNow, backupNow, restoreFromCloud],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return ctx;
}
