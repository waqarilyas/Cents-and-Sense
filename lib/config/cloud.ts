import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra || {}) as Record<string, string>;

export const CLOUD_CONFIG = {
  supabaseUrl: extra.SUPABASE_URL || "",
  supabasePublishableKey: extra.SUPABASE_PUBLISHABLE_KEY || extra.SUPABASE_ANON_KEY || "",
  revenueCatApiKeyAndroid:
    extra.REVENUECAT_ANDROID_PUBLIC_API_KEY || extra.REVENUECAT_ANDROID_KEY || "",
  revenueCatApiKeyIos:
    extra.REVENUECAT_IOS_PUBLIC_API_KEY || extra.REVENUECAT_IOS_KEY || "",
};

export function hasSupabaseConfig(): boolean {
  return Boolean(CLOUD_CONFIG.supabaseUrl && CLOUD_CONFIG.supabasePublishableKey);
}
