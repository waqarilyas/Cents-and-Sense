import AsyncStorage from "@react-native-async-storage/async-storage";

const mockRestorePurchases = jest.fn();

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: mockRestorePurchases,
  },
}));

import { billingService } from "../../lib/services/BillingService";

describe("BillingService.restorePurchases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (billingService as any).purchasesModule = null;
  });

  it("returns premium subscription entitlement and updates cache", async () => {
    mockRestorePurchases.mockResolvedValue({
      entitlements: { active: { pro_subscription: { id: "sub" } } },
    });

    const result = await billingService.restorePurchases();

    expect(result.pro_subscription).toBe(true);
    expect(result.pro_lifetime).toBe(false);
    expect(typeof result.validatedAt).toBe("number");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@billing_entitlement_cache",
      expect.stringContaining('"pro_subscription":true'),
    );
  });

  it("returns lifetime entitlement and updates cache", async () => {
    mockRestorePurchases.mockResolvedValue({
      entitlements: { active: { pro_lifetime: { id: "life" } } },
    });

    const result = await billingService.restorePurchases();

    expect(result.pro_subscription).toBe(false);
    expect(result.pro_lifetime).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@billing_entitlement_cache",
      expect.stringContaining('"pro_lifetime":true'),
    );
  });

  it("returns non-premium when no active entitlements are restored", async () => {
    mockRestorePurchases.mockResolvedValue({
      entitlements: { active: {} },
    });

    const result = await billingService.restorePurchases();

    expect(result.pro_subscription).toBe(false);
    expect(result.pro_lifetime).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
