export interface AppFeatureFlags {
  authEnabled: boolean;
  premiumEnabled: boolean;
  paywallEnabled: boolean;
  syncEnabled: boolean;
  exportEnabled: boolean;
  restorePurchasesEnabled: boolean;
  profileSetupEnabled: boolean;
  analyticsEnabled: boolean;
  analyticsRequiresPremium: boolean;
}

export const DEFAULT_APP_FEATURE_FLAGS: AppFeatureFlags = {
  authEnabled: false,
  premiumEnabled: false,
  paywallEnabled: false,
  syncEnabled: false,
  exportEnabled: false,
  restorePurchasesEnabled: false,
  profileSetupEnabled: false,
  analyticsEnabled: true,
  analyticsRequiresPremium: false,
};

export const APP_FEATURE_FLAG_DB_KEYS: Record<keyof AppFeatureFlags, string> = {
  authEnabled: "auth_enabled",
  premiumEnabled: "premium_enabled",
  paywallEnabled: "paywall_enabled",
  syncEnabled: "sync_enabled",
  exportEnabled: "export_enabled",
  restorePurchasesEnabled: "restore_purchases_enabled",
  profileSetupEnabled: "profile_setup_enabled",
  analyticsEnabled: "analytics_enabled",
  analyticsRequiresPremium: "analytics_requires_premium",
};

export const APP_FEATURE_FLAG_FIELDS_BY_DB_KEY = Object.fromEntries(
  Object.entries(APP_FEATURE_FLAG_DB_KEYS).map(([field, key]) => [key, field]),
) as Record<string, keyof AppFeatureFlags>;

export function serializeFeatureFlagValue(value: boolean): string {
  return value ? "1" : "0";
}

export function parseFeatureFlagValue(value: string): boolean {
  return value === "1" || value.toLowerCase() === "true";
}
