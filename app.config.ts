import type { ConfigContext, ExpoConfig } from "@expo/config";
import baseConfigJson from "./app.json";

const baseConfig = (baseConfigJson as { expo: ExpoConfig }).expo;

export default ({ config }: ConfigContext): ExpoConfig => {
  const extraFromBase = (baseConfig.extra || {}) as Record<string, unknown>;

  return {
    ...baseConfig,
    ...config,
    extra: {
      ...extraFromBase,
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
      SUPABASE_PUBLISHABLE_KEY:
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "",
      REVENUECAT_IOS_PUBLIC_API_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_PUBLIC_API_KEY || process.env.REVENUECAT_IOS_PUBLIC_API_KEY || "",
      REVENUECAT_ANDROID_PUBLIC_API_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_PUBLIC_API_KEY || process.env.REVENUECAT_ANDROID_PUBLIC_API_KEY || "",
      // Backward-compatible aliases for older client code paths.
      SUPABASE_ANON_KEY:
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        "",
      REVENUECAT_IOS_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_PUBLIC_API_KEY ||
        process.env.REVENUECAT_IOS_PUBLIC_API_KEY ||
        process.env.REVENUECAT_IOS_KEY ||
        "",
      REVENUECAT_ANDROID_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_PUBLIC_API_KEY ||
        process.env.REVENUECAT_ANDROID_PUBLIC_API_KEY ||
        process.env.REVENUECAT_ANDROID_KEY ||
        "",
    },
  };
};
