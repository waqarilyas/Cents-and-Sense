export interface EntitlementState {
  isPremium: boolean;
  source: "live" | "cache" | "none";
  lastValidatedAt: number | null;
}

export interface CachedEntitlement {
  isPremium?: boolean;
  pro_subscription?: boolean;
  pro_lifetime?: boolean;
  validatedAt: number;
}

export interface LiveEntitlements {
  pro_subscription?: boolean;
  pro_lifetime?: boolean;
  validatedAt?: number;
}

export function resolveEntitlementState(
  live: LiveEntitlements | null,
  cached: CachedEntitlement | null,
  now: number,
  graceMs: number,
): EntitlementState {
  if (live) {
    const isPremium = Boolean(live.pro_subscription || live.pro_lifetime);
    return {
      isPremium,
      source: "live",
      lastValidatedAt: live.validatedAt ?? now,
    };
  }

  if (cached) {
    const withinGrace = now - cached.validatedAt <= graceMs;
    if (withinGrace) {
      const cachedPremium =
        typeof cached.isPremium === "boolean"
          ? cached.isPremium
          : Boolean(cached.pro_subscription || cached.pro_lifetime);
      return {
        isPremium: cachedPremium,
        source: "cache",
        lastValidatedAt: cached.validatedAt,
      };
    }
  }

  return { isPremium: false, source: "none", lastValidatedAt: null };
}
