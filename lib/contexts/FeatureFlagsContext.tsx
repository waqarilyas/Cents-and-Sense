import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getDatabase } from "../database";
import {
  APP_FEATURE_FLAG_FIELDS_BY_DB_KEY,
  AppFeatureFlags,
  DEFAULT_APP_FEATURE_FLAGS,
  parseFeatureFlagValue,
} from "../featureFlags";

interface FeatureFlagsContextType {
  flags: AppFeatureFlags;
  loading: boolean;
  refreshFlags: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(
  undefined,
);

export function FeatureFlagsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [flags, setFlags] = useState<AppFeatureFlags>(DEFAULT_APP_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);

  const refreshFlags = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ key: string; value: string }>(
        "SELECT key, value FROM app_feature_flags",
      );

      const nextFlags = { ...DEFAULT_APP_FEATURE_FLAGS };
      for (const row of rows) {
        const field = APP_FEATURE_FLAG_FIELDS_BY_DB_KEY[row.key];
        if (!field) continue;
        nextFlags[field] = parseFeatureFlagValue(row.value);
      }

      setFlags(nextFlags);
    } catch (error) {
      console.error("Failed to load feature flags:", error);
      setFlags(DEFAULT_APP_FEATURE_FLAGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFlags();
  }, [refreshFlags]);

  const value = useMemo(
    () => ({
      flags,
      loading,
      refreshFlags,
    }),
    [flags, loading, refreshFlags],
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within FeatureFlagsProvider");
  }
  return context;
}
