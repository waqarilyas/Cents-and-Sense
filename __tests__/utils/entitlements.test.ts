import { resolveEntitlementState } from "../../lib/utils/entitlements";

describe("resolveEntitlementState", () => {
  const now = 1_000_000;
  const graceMs = 10_000;

  it("uses live entitlements when available", () => {
    const state = resolveEntitlementState(
      { pro_subscription: true, validatedAt: now - 100 },
      { isPremium: false, validatedAt: now - 200 },
      now,
      graceMs,
    );

    expect(state.isPremium).toBe(true);
    expect(state.source).toBe("live");
    expect(state.lastValidatedAt).toBe(now - 100);
  });

  it("uses cached entitlement within grace window", () => {
    const state = resolveEntitlementState(
      null,
      { isPremium: true, validatedAt: now - 5_000 },
      now,
      graceMs,
    );

    expect(state.isPremium).toBe(true);
    expect(state.source).toBe("cache");
  });

  it("supports legacy cached shape from billing service", () => {
    const state = resolveEntitlementState(
      null,
      { pro_subscription: false, pro_lifetime: true, validatedAt: now - 5_000 },
      now,
      graceMs,
    );

    expect(state.isPremium).toBe(true);
    expect(state.source).toBe("cache");
  });

  it("falls back to non-premium when cache is stale and no live data", () => {
    const state = resolveEntitlementState(
      null,
      { isPremium: true, validatedAt: now - 20_000 },
      now,
      graceMs,
    );

    expect(state.isPremium).toBe(false);
    expect(state.source).toBe("none");
    expect(state.lastValidatedAt).toBeNull();
  });
});
