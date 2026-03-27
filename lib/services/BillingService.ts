import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";

const ENTITLEMENT_CACHE_KEY = "@billing_entitlement_cache";

export type ProductPlan = "monthly" | "yearly" | "lifetime";

export interface BillingEntitlements {
  pro_subscription: boolean;
  pro_lifetime: boolean;
  validatedAt: number;
}

export interface OfferingStatus {
  hasCurrentOffering: boolean;
  availablePackageIds: string[];
}

class BillingService {
  private purchasesModule: any = null;

  private getPurchasesModule() {
    if (this.purchasesModule !== null) return this.purchasesModule;
    try {
      // Optional runtime dependency. App still works in dev/test if SDK missing.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.purchasesModule = require("react-native-purchases").default;
    } catch {
      this.purchasesModule = undefined;
    }
    return this.purchasesModule;
  }

  async configure(apiKey: string, appUserId?: string): Promise<void> {
    const purchases = this.getPurchasesModule();
    if (!purchases || !apiKey) return;

    await purchases.configure({
      apiKey,
      appUserID: appUserId,
      observerMode: false,
      usesStoreKit2IfAvailable: Platform.OS === "ios",
    });
  }

  async logIn(userId: string): Promise<void> {
    const purchases = this.getPurchasesModule();
    if (!purchases) return;
    await purchases.logIn(userId);
  }

  async logOut(): Promise<void> {
    const purchases = this.getPurchasesModule();
    if (!purchases) return;
    await purchases.logOut();
  }

  async getEntitlements(): Promise<BillingEntitlements | null> {
    const purchases = this.getPurchasesModule();
    if (!purchases) return null;

    const info = await purchases.getCustomerInfo();
    const active = info?.entitlements?.active || {};
    const entitlements: BillingEntitlements = {
      pro_subscription: Boolean(active.pro_subscription),
      pro_lifetime: Boolean(active.pro_lifetime),
      validatedAt: Date.now(),
    };

    await AsyncStorage.setItem(ENTITLEMENT_CACHE_KEY, JSON.stringify(entitlements));
    return entitlements;
  }

  async purchase(plan: ProductPlan): Promise<void> {
    const purchases = this.getPurchasesModule();
    if (!purchases) {
      throw new Error("Billing SDK is not installed. Add react-native-purchases to enable purchases.");
    }

    const entitlementToPackage: Record<ProductPlan, string> = {
      monthly: "$rc_monthly",
      yearly: "$rc_annual",
      lifetime: "$rc_lifetime",
    };

    const offerings = await purchases.getOfferings();
    const current = offerings?.current;
    if (!current) {
      throw new Error(
        "No active offering available. Configure a Current Offering in RevenueCat with monthly/yearly/lifetime packages.",
      );
    }

    const pkg = current.availablePackages.find(
      (p: any) => p.identifier === entitlementToPackage[plan],
    );
    if (!pkg) {
      const availableIds =
        current.availablePackages?.map((p: any) => p.identifier).join(", ") ||
        "none";
      throw new Error(
        `Package not found for ${plan}. Available packages: ${availableIds}`,
      );
    }

    await purchases.purchasePackage(pkg);
  }

  async restorePurchases(): Promise<BillingEntitlements> {
    const purchases = this.getPurchasesModule();
    if (!purchases) {
      throw new Error("Billing SDK is not installed. Add react-native-purchases to enable restore.");
    }

    const info = await purchases.restorePurchases();
    const active = info?.entitlements?.active || {};
    const entitlements: BillingEntitlements = {
      pro_subscription: Boolean(active.pro_subscription),
      pro_lifetime: Boolean(active.pro_lifetime),
      validatedAt: Date.now(),
    };

    await AsyncStorage.setItem(ENTITLEMENT_CACHE_KEY, JSON.stringify(entitlements));
    return entitlements;
  }

  async getCachedEntitlements(): Promise<BillingEntitlements | null> {
    const raw = await AsyncStorage.getItem(ENTITLEMENT_CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BillingEntitlements;
    } catch {
      return null;
    }
  }

  async getOfferingStatus(): Promise<OfferingStatus | null> {
    const purchases = this.getPurchasesModule();
    if (!purchases) return null;

    const offerings = await purchases.getOfferings();
    const current = offerings?.current;
    const availablePackageIds = (current?.availablePackages || []).map(
      (p: any) => p.identifier,
    );

    return {
      hasCurrentOffering: Boolean(current),
      availablePackageIds,
    };
  }

  async openManageSubscriptionPortal(): Promise<void> {
    const url =
      Platform.OS === "ios"
        ? "https://apps.apple.com/account/subscriptions"
        : "https://play.google.com/store/account/subscriptions";

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error("Unable to open subscription settings on this device.");
    }
    await Linking.openURL(url);
  }
}

export const billingService = new BillingService();
