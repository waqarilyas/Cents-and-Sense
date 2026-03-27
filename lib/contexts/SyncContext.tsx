import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNetInfo } from "@react-native-community/netinfo";
import { getDatabase } from "../database";
import { createSyncSafetyBackup } from "../utils/dataManagement";
import { supabaseService } from "../services/SupabaseService";
import { useAuth } from "./AuthContext";
import { useEntitlements } from "./EntitlementContext";

type SyncStatus = "idle" | "syncing" | "error" | "success";
export type SyncSetupStrategy = "merge" | "local_to_cloud" | "cloud_to_local" | "skip";

interface SyncTableStats {
  table: SyncTable;
  localCount: number;
  cloudCount: number;
  conflicts: number;
}

interface SyncReadiness {
  localTotal: number;
  cloudTotal: number;
  conflictsTotal: number;
  recommendation: Exclude<SyncSetupStrategy, "skip">;
  tables: SyncTableStats[];
}

interface SyncTableSummary {
  table: SyncTable;
  pushed: number;
  pulled: number;
  conflicts: number;
}

interface SyncRunSummary {
  mode: Exclude<SyncSetupStrategy, "skip">;
  startedAt: number;
  finishedAt: number;
  totalPushed: number;
  totalPulled: number;
  totalConflicts: number;
  safetyBackupUri?: string;
  tables: SyncTableSummary[];
}

interface SyncContextType {
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  syncError: string | null;
  isOnline: boolean;
  unsyncedChanges: number;
  syncProfileNow: () => Promise<void>;
  syncNow: () => Promise<void>;
  backupNow: () => Promise<void>;
  restoreFromCloud: () => Promise<void>;
  getSyncReadiness: () => Promise<SyncReadiness>;
  runSyncSetup: (strategy: Exclude<SyncSetupStrategy, "skip">) => Promise<SyncRunSummary>;
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

const SYNC_SETUP_COMPLETED_KEY = "sync_setup_completed";

function tableNameToStateKey(table: string): string {
  return `sync_${table}_lastPulledAt`;
}

function rowUpdatedAt(row: Record<string, any>): number {
  return Number(row.updatedAt || row.createdAt || 0);
}

function normalizeForCompare(row: Record<string, any>) {
  const copy = { ...row };
  delete copy.updatedAt;
  delete copy.createdAt;
  delete copy.deviceId;
  return copy;
}

function countConflicts(localRows: Record<string, any>[], remoteRows: Record<string, any>[]): number {
  const remoteMap = new Map(remoteRows.map((row) => [row.id, row]));
  let conflicts = 0;

  for (const localRow of localRows) {
    const remoteRow = remoteMap.get(localRow.id);
    if (!remoteRow) continue;
    if (JSON.stringify(normalizeForCompare(localRow)) !== JSON.stringify(normalizeForCompare(remoteRow))) {
      conflicts += 1;
    }
  }
  return conflicts;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const netInfo = useNetInfo();
  const isOnline = Boolean(netInfo.isConnected && netInfo.isInternetReachable !== false);
  const { authState, userId } = useAuth();
  const { isPremium } = useEntitlements();
  const profileAutoSyncUserRef = useRef<string | null>(null);
  const premiumAutoSyncUserRef = useRef<string | null>(null);
  const lastAutoSyncAttemptRef = useRef(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [unsyncedChanges, setUnsyncedChanges] = useState(0);

  const requireAuthenticated = useCallback(() => {
    if (authState === "guest" || !userId) {
      throw new Error("Please log in to sync across devices");
    }
  }, [authState, userId]);

  const requirePremium = useCallback(() => {
    if (!isPremium) {
      throw new Error("Cloud sync is a premium feature");
    }
  }, [isPremium]);

  const ensureSession = useCallback(async () => {
    const isSupabaseReady = await supabaseService.isConfigured();
    if (!isSupabaseReady) {
      throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
    }

    const session = await supabaseService.getSession();
    if (!session?.access_token) {
      throw new Error("No authenticated session found");
    }
    await supabaseService.verifySyncSchema(session.access_token);
    return session.access_token;
  }, []);

  const getTableColumns = useCallback(async (table: string): Promise<string[]> => {
    const db = await getDatabase();
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    return cols.map((c) => c.name);
  }, []);

  const claimGuestRowsForUser = useCallback(
    async (table: SyncTable, targetUserId: string) => {
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

  const getLocalRowsForUser = useCallback(async (table: SyncTable, targetUserId: string) => {
    const db = await getDatabase();
    return db.getAllAsync<Record<string, any>>(
      `SELECT * FROM ${table} WHERE (userId IS NULL OR userId = ?)`,
      [targetUserId],
    );
  }, []);

  const rowsForCloud = useCallback(
    (rows: Record<string, any>[], targetUserId: string) =>
      rows.map((row) => ({
        ...row,
        userId: targetUserId,
        updatedAt: row.updatedAt || row.createdAt || Date.now(),
      })),
    [],
  );

  const upsertLocalRows = useCallback(
    async (table: SyncTable, rows: Record<string, any>[]) => {
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
        await db.runAsync(sql, keys.map((k) => row[k]));
      }
    },
    [getTableColumns],
  );

  const setWatermark = useCallback(async (table: SyncTable, watermark: number) => {
    const db = await getDatabase();
    const stateKey = tableNameToStateKey(table);
    await db.runAsync(
      "INSERT INTO sync_state (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt",
      [stateKey, String(watermark), Date.now()],
    );
  }, []);

  const pushedStateKey = useCallback((table: SyncTable) => `sync_${table}_lastPushedAt`, []);

  const getLastPushedAt = useCallback(
    async (table: SyncTable): Promise<number> => {
      const db = await getDatabase();
      const result = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM sync_state WHERE key = ? LIMIT 1",
        [pushedStateKey(table)],
      );
      return Number(result?.value || 0);
    },
    [pushedStateKey],
  );

  const setLastPushedAt = useCallback(
    async (table: SyncTable, watermark: number) => {
      const db = await getDatabase();
      await db.runAsync(
        "INSERT INTO sync_state (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt",
        [pushedStateKey(table), String(watermark), Date.now()],
      );
    },
    [pushedStateKey],
  );

  const refreshUnsyncedChanges = useCallback(async () => {
    if (authState === "guest" || !userId || !isPremium) {
      setUnsyncedChanges(0);
      return;
    }

    const db = await getDatabase();
    let total = 0;
    for (const table of SYNC_TABLES) {
      const lastPushedAt = await getLastPushedAt(table);
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table} WHERE (userId IS NULL OR userId = ?) AND updatedAt > ?`,
        [userId, lastPushedAt],
      );
      total += Number(result?.count || 0);
    }
    setUnsyncedChanges(total);
  }, [authState, getLastPushedAt, isPremium, userId]);

  const markSyncSetupCompleted = useCallback(async () => {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT INTO sync_state (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt",
      [SYNC_SETUP_COMPLETED_KEY, "true", Date.now()],
    );
  }, []);

  const softClearLocalNamespace = useCallback(
    async (table: SyncTable, targetUserId: string) => {
      const db = await getDatabase();
      const cols = await getTableColumns(table);
      if (cols.includes("deletedAt")) {
        await db.runAsync(
          `UPDATE ${table} SET deletedAt = ?, updatedAt = ? WHERE (userId IS NULL OR userId = ?)`,
          [Date.now(), Date.now(), targetUserId],
        );
      } else {
        await db.runAsync(`DELETE FROM ${table} WHERE (userId IS NULL OR userId = ?)`, [targetUserId]);
      }
    },
    [getTableColumns],
  );

  const pushByLww = useCallback(
    async (
      table: SyncTable,
      localRows: Record<string, any>[],
      remoteRows: Record<string, any>[],
      accessToken: string,
    ) => {
      const remoteMap = new Map(remoteRows.map((row) => [row.id, row]));
      const winners = localRows.filter((localRow) => {
        const remoteRow = remoteMap.get(localRow.id);
        if (!remoteRow) return true;
        return rowUpdatedAt(localRow) >= rowUpdatedAt(remoteRow);
      });
      if (winners.length) {
        await supabaseService.upsertRows(table, winners, accessToken);
      }
      return winners.length;
    },
    [],
  );

  const executeSyncMode = useCallback(
    async (
      mode: Exclude<SyncSetupStrategy, "skip">,
      options?: { requirePremium?: boolean; profileOnly?: boolean },
    ): Promise<SyncRunSummary> => {
      requireAuthenticated();
      if (options?.requirePremium) {
        requirePremium();
      }
      const targetUserId = userId as string;
      const accessToken = await ensureSession();
      const startedAt = Date.now();

      setSyncStatus("syncing");
      setSyncError(null);

      try {
        const tables = options?.profileOnly ? (["user_profile"] as SyncTable[]) : [...SYNC_TABLES];
        let safetyBackupUri: string | undefined;
        if (mode === "cloud_to_local" && !options?.profileOnly) {
          safetyBackupUri = await createSyncSafetyBackup();
        }

        const tableSummaries: SyncTableSummary[] = [];

        for (const table of tables) {
          await claimGuestRowsForUser(table, targetUserId);
          const localRaw = await getLocalRowsForUser(table, targetUserId);
          const localRows = rowsForCloud(localRaw, targetUserId);
          const remoteRows = await supabaseService.pullAllRows(table, targetUserId, accessToken);
          const conflicts = countConflicts(localRows, remoteRows);

          let pushed = 0;
          let pulled = 0;

          if (mode === "local_to_cloud") {
            if (localRows.length) {
              await supabaseService.upsertRows(table, localRows, accessToken);
              pushed = localRows.length;
            }
            await setLastPushedAt(
              table,
              localRows.length ? Math.max(...localRows.map((row) => rowUpdatedAt(row))) : 0,
            );
            const remoteAfter = await supabaseService.pullAllRows(table, targetUserId, accessToken);
            pulled = remoteAfter.length;
            await upsertLocalRows(table, remoteAfter);
            await setWatermark(
              table,
              remoteAfter.length
                ? Math.max(...remoteAfter.map((row) => rowUpdatedAt(row)))
                : 0,
            );
          } else if (mode === "cloud_to_local") {
            await softClearLocalNamespace(table, targetUserId);
            await upsertLocalRows(table, remoteRows);
            pulled = remoteRows.length;
            await setLastPushedAt(
              table,
              remoteRows.length ? Math.max(...remoteRows.map((row) => rowUpdatedAt(row))) : 0,
            );
            await setWatermark(
              table,
              remoteRows.length
                ? Math.max(...remoteRows.map((row) => rowUpdatedAt(row)))
                : 0,
            );
          } else {
            pushed = await pushByLww(table, localRows, remoteRows, accessToken);
            await setLastPushedAt(
              table,
              localRows.length ? Math.max(...localRows.map((row) => rowUpdatedAt(row))) : 0,
            );
            const remoteAfter = await supabaseService.pullAllRows(table, targetUserId, accessToken);
            pulled = remoteAfter.length;
            await upsertLocalRows(table, remoteAfter);
            await setWatermark(
              table,
              remoteAfter.length
                ? Math.max(...remoteAfter.map((row) => rowUpdatedAt(row)))
                : 0,
            );
          }

          tableSummaries.push({
            table,
            pushed,
            pulled,
            conflicts,
          });
        }

        if (!options?.profileOnly) {
          await markSyncSetupCompleted();
        }

        const finishedAt = Date.now();
        const summary: SyncRunSummary = {
          mode,
          startedAt,
          finishedAt,
          totalPushed: tableSummaries.reduce((sum, row) => sum + row.pushed, 0),
          totalPulled: tableSummaries.reduce((sum, row) => sum + row.pulled, 0),
          totalConflicts: tableSummaries.reduce((sum, row) => sum + row.conflicts, 0),
          safetyBackupUri,
          tables: tableSummaries,
        };

        setLastSyncAt(finishedAt);
        setSyncStatus("success");
        await refreshUnsyncedChanges();
        return summary;
      } catch (error) {
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Sync failed");
        await refreshUnsyncedChanges().catch(() => undefined);
        throw error;
      }
    },
    [
      claimGuestRowsForUser,
      ensureSession,
      getLocalRowsForUser,
      markSyncSetupCompleted,
      pushByLww,
      requireAuthenticated,
      requirePremium,
      rowsForCloud,
      setLastPushedAt,
      setWatermark,
      softClearLocalNamespace,
      upsertLocalRows,
      userId,
      refreshUnsyncedChanges,
    ],
  );

  const syncProfileNow = useCallback(async () => {
    await executeSyncMode("merge", { profileOnly: true, requirePremium: true });
  }, [executeSyncMode]);

  const syncNow = useCallback(async () => {
    await executeSyncMode("merge", { requirePremium: true });
  }, [executeSyncMode]);

  const backupNow = useCallback(async () => {
    await executeSyncMode("local_to_cloud", { requirePremium: true });
  }, [executeSyncMode]);

  const restoreFromCloud = useCallback(async () => {
    await executeSyncMode("cloud_to_local", { requirePremium: true });
  }, [executeSyncMode]);

  const getSyncReadiness = useCallback(async (): Promise<SyncReadiness> => {
    requireAuthenticated();
    requirePremium();
    const targetUserId = userId as string;
    const accessToken = await ensureSession();

    const tableStats: SyncTableStats[] = [];

    for (const table of SYNC_TABLES) {
      await claimGuestRowsForUser(table, targetUserId);
      const localRows = rowsForCloud(await getLocalRowsForUser(table, targetUserId), targetUserId);
      const remoteRows = await supabaseService.pullAllRows(table, targetUserId, accessToken);
      tableStats.push({
        table,
        localCount: localRows.filter((row) => row.deletedAt == null).length,
        cloudCount: remoteRows.filter((row) => row.deletedAt == null).length,
        conflicts: countConflicts(localRows, remoteRows),
      });
    }

    const localTotal = tableStats.reduce((sum, row) => sum + row.localCount, 0);
    const cloudTotal = tableStats.reduce((sum, row) => sum + row.cloudCount, 0);
    const conflictsTotal = tableStats.reduce((sum, row) => sum + row.conflicts, 0);

    let recommendation: Exclude<SyncSetupStrategy, "skip"> = "merge";
    if (localTotal === 0 && cloudTotal > 0) {
      recommendation = "cloud_to_local";
    } else if (localTotal > 0 && cloudTotal === 0) {
      recommendation = "local_to_cloud";
    }

    return {
      localTotal,
      cloudTotal,
      conflictsTotal,
      recommendation,
      tables: tableStats,
    };
  }, [
    claimGuestRowsForUser,
    ensureSession,
    getLocalRowsForUser,
    requireAuthenticated,
    requirePremium,
    rowsForCloud,
    userId,
  ]);

  const runSyncSetup = useCallback(
    async (strategy: Exclude<SyncSetupStrategy, "skip">) => {
      return executeSyncMode(strategy, { requirePremium: true });
    },
    [executeSyncMode],
  );

  useEffect(() => {
    if (authState === "guest" || !userId || !isPremium) {
      profileAutoSyncUserRef.current = null;
      premiumAutoSyncUserRef.current = null;
      setUnsyncedChanges(0);
      return;
    }

    if (profileAutoSyncUserRef.current !== userId) {
      profileAutoSyncUserRef.current = userId;
      syncProfileNow().catch(() => undefined);
    }

    if (isPremium && premiumAutoSyncUserRef.current !== userId) {
      premiumAutoSyncUserRef.current = userId;
      syncNow().catch(() => undefined);
    }
    refreshUnsyncedChanges().catch(() => undefined);
  }, [authState, isPremium, syncNow, syncProfileNow, userId, refreshUnsyncedChanges]);

  useEffect(() => {
    if (authState === "guest" || !userId || !isPremium) return;
    refreshUnsyncedChanges().catch(() => undefined);
    const interval = setInterval(() => {
      refreshUnsyncedChanges().catch(() => undefined);
    }, 15000);
    return () => clearInterval(interval);
  }, [authState, isPremium, userId, refreshUnsyncedChanges]);

  useEffect(() => {
    if (authState === "guest" || !userId || !isPremium) return;
    if (!isOnline) return;
    if (syncStatus === "syncing") return;
    if (unsyncedChanges <= 0) return;

    const now = Date.now();
    if (now - lastAutoSyncAttemptRef.current < 20000) return;
    lastAutoSyncAttemptRef.current = now;
    syncNow().catch(() => undefined);
  }, [authState, isOnline, isPremium, syncNow, syncStatus, unsyncedChanges, userId]);

  const value = useMemo(
    () => ({
      syncStatus,
      lastSyncAt,
      syncError,
      isOnline,
      unsyncedChanges,
      syncProfileNow,
      syncNow,
      backupNow,
      restoreFromCloud,
      getSyncReadiness,
      runSyncSetup,
    }),
    [
      syncStatus,
      lastSyncAt,
      syncError,
      isOnline,
      unsyncedChanges,
      syncProfileNow,
      syncNow,
      backupNow,
      restoreFromCloud,
      getSyncReadiness,
      runSyncSetup,
    ],
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
