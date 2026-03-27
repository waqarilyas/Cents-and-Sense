import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";
import { billingService, ProductPlan } from "../services/BillingService";
import { useAuth } from "./AuthContext";
import { CLOUD_CONFIG } from "../config/cloud";
import { resolveEntitlementState } from "../utils/entitlements";

const ENTITLEMENT_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

interface EntitlementContextType {
  isPremium: boolean;
  source: "live" | "cache" | "none";
  loading: boolean;
  refreshEntitlements: () => Promise<void>;
  purchasePlan: (plan: ProductPlan) => Promise<void>;
  restorePurchases: () => Promise<{ restoredPremium: boolean }>;
}

const EntitlementContext = createContext<EntitlementContextType | undefined>(
  undefined,
);

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { authState, userId } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [source, setSource] = useState<"live" | "cache" | "none">("none");
  const [loading, setLoading] = useState(true);

  const configureBilling = useCallback(async () => {
    const apiKey =
      Platform.OS === "ios"
        ? CLOUD_CONFIG.revenueCatApiKeyIos
        : CLOUD_CONFIG.revenueCatApiKeyAndroid;

    if (!apiKey) {
      throw new Error(
        "RevenueCat API key is missing. Set REVENUECAT_API_KEY_IOS/ANDROID in your environment.",
      );
    }

    await billingService.configure(
      apiKey,
      authState === "guest" ? undefined : userId || undefined,
    );
  }, [authState, userId]);

  const refreshEntitlements = useCallback(async () => {
    try {
      setLoading(true);
      await configureBilling();

      const [live, cached] = await Promise.all([
        billingService.getEntitlements().catch(() => null),
        billingService.getCachedEntitlements(),
      ]);

      const resolved = resolveEntitlementState(
        live,
        cached,
        Date.now(),
        ENTITLEMENT_GRACE_MS,
      );

      setIsPremium(resolved.isPremium);
      setSource(resolved.source);
    } finally {
      setLoading(false);
    }
  }, [configureBilling]);

  useEffect(() => {
    refreshEntitlements();
  }, [refreshEntitlements]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshEntitlements().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [refreshEntitlements]);

  const purchasePlan = useCallback(async (plan: ProductPlan) => {
    await configureBilling();
    await billingService.purchase(plan);
    await refreshEntitlements();
  }, [configureBilling, refreshEntitlements]);

  const restorePurchases = useCallback(async () => {
    await configureBilling();
    const restored = await billingService.restorePurchases();
    await refreshEntitlements();
    return {
      restoredPremium: Boolean(restored.pro_subscription || restored.pro_lifetime),
    };
  }, [configureBilling, refreshEntitlements]);

  const value = useMemo(
    () => ({
      isPremium,
      source,
      loading,
      refreshEntitlements,
      purchasePlan,
      restorePurchases,
    }),
    [isPremium, source, loading, refreshEntitlements, purchasePlan, restorePurchases],
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlements() {
  const ctx = useContext(EntitlementContext);
  if (!ctx) {
    throw new Error("useEntitlements must be used within EntitlementProvider");
  }
  return ctx;
}
