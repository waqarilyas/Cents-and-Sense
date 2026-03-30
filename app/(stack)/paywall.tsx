import { useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeColors, ThemeColors, spacing, borderRadius } from "../../lib/theme";
import { Card } from "../../lib/components";
import { useEntitlements } from "../../lib/contexts/EntitlementContext";
import { useAuth } from "../../lib/contexts/AuthContext";
import { useUser } from "../../lib/contexts/UserContext";
import { billingService } from "../../lib/services/BillingService";
import { useFeatureFlags } from "../../lib/contexts/FeatureFlagsContext";

interface PlanCardProps {
  title: string;
  subtitle: string;
  price: string;
  badge?: string;
  cta: string;
  highlighted?: boolean;
  onPress: () => Promise<void>;
}

function PlanCard({
  title,
  subtitle,
  price,
  badge,
  cta,
  highlighted,
  onPress,
}: PlanCardProps) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);

  return (
    <Card
      style={[
        styles.planCard,
        highlighted ? { borderColor: colors.primary, borderWidth: 2 } : null,
      ]}
    >
      <View style={styles.planHeader}>
        <View>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planSubtitle}>{subtitle}</Text>
        </View>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.planPrice}>{price}</Text>
      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: colors.primary }]}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await onPress();
          } finally {
            setBusy(false);
          }
        }}
      >
        <Text style={styles.ctaText}>{busy ? "Please wait..." : cta}</Text>
      </TouchableOpacity>
    </Card>
  );
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const { isPremium, source, purchasePlan, restorePurchases, loading } = useEntitlements();
  const { authState, email } = useAuth();
  const { userName } = useUser();
  const params = useLocalSearchParams<{ pendingPlan?: string }>();
  const pendingPlan = params.pendingPlan as "monthly" | "yearly" | "lifetime" | undefined;
  const [offeringStatus, setOfferingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!flagsLoading && (!flags.premiumEnabled || !flags.paywallEnabled)) {
      router.replace("/(tabs)");
    }
  }, [flags.paywallEnabled, flags.premiumEnabled, flagsLoading, router]);

  if (flagsLoading || !flags.premiumEnabled || !flags.paywallEnabled) {
    return null;
  }

  const onPurchase = async (plan: "monthly" | "yearly" | "lifetime") => {
    if (authState === "guest") {
      router.push({
        pathname: "/(stack)/auth",
        params: { pendingPlan: plan },
      });
      return;
    }

    if (!userName?.trim()) {
      router.push({
        pathname: "/(stack)/profile-setup",
        params: { pendingPlan: plan },
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await purchasePlan(plan);
      Alert.alert("Success", "Premium unlocked successfully.");
      router.back();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to complete purchase.";
      Alert.alert(
        "Purchase Failed",
        message,
        message.includes("No active offering available")
          ? [
              { text: "OK", style: "cancel" },
              {
                text: "How To Fix",
                onPress: () =>
                  Alert.alert(
                    "RevenueCat Setup Required",
                    "Create an Offering in RevenueCat, mark it Current, and add $rc_monthly, $rc_annual, and $rc_lifetime packages.",
                  ),
              },
            ]
          : [{ text: "OK" }],
      );
    }
  };

  useEffect(() => {
    billingService
      .getOfferingStatus()
      .then((status) => {
        if (!status) return;
        if (!status.hasCurrentOffering) {
          setOfferingStatus("No current offering configured in RevenueCat.");
          return;
        }
        if (!status.availablePackageIds.length) {
          setOfferingStatus("Current offering has no packages.");
          return;
        }
        setOfferingStatus(null);
      })
      .catch(() => undefined);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <Ionicons name="diamond" size={36} color={colors.primary} />
          <Text style={styles.heroTitle}>
            {isPremium ? "Premium is Active" : "Unlock Premium Features"}
          </Text>
          <Text style={styles.heroSubtitle}>
            Analytics, cloud sync, export, and cloud backup.
          </Text>
          {isPremium ? (
            <Text style={styles.statusText}>Status source: {source}</Text>
          ) : null}
          {authState !== "guest" ? (
            <Text style={styles.statusText}>
              Signed in as {email || "authenticated user"}
            </Text>
          ) : null}
          {!isPremium && authState === "guest" ? (
            <Text style={styles.statusText}>
              Login is required before purchase so your subscription syncs across devices.
            </Text>
          ) : null}
          {!isPremium && authState !== "guest" && !userName?.trim() ? (
            <Text style={styles.statusText}>
              Complete your profile before checkout so purchases and sync stay linked to your account.
            </Text>
          ) : null}
          {pendingPlan && authState !== "guest" ? (
            <Text style={styles.statusText}>
              Continue with your selected plan: {pendingPlan}
            </Text>
          ) : null}
          {loading ? <Text style={styles.statusText}>Checking premium status...</Text> : null}
          {offeringStatus ? (
            <Text style={[styles.statusText, { color: colors.error }]}>
              {offeringStatus}
            </Text>
          ) : null}
        </Card>

        {!isPremium ? (
          <>
            <PlanCard
              title="Monthly"
              subtitle="7-day free trial"
              price="$4.99 / month"
              cta="Start Monthly"
              onPress={() => onPurchase("monthly")}
            />
            <PlanCard
              title="Yearly"
              subtitle="Best value + 7-day trial"
              price="$39.99 / year"
              badge="Popular"
              highlighted
              cta="Start Yearly"
              onPress={() => onPurchase("yearly")}
            />
            <PlanCard
              title="Lifetime"
              subtitle="One-time purchase"
              price="$79.99 once"
              cta="Unlock Lifetime"
              onPress={() => onPurchase("lifetime")}
            />
          </>
        ) : null}

        <Card style={styles.secondaryCard}>
          <TouchableOpacity
            style={styles.secondaryRow}
            onPress={async () => {
              try {
                const result = await restorePurchases();
                if (result.restoredPremium) {
                  Alert.alert("Restore Complete", "Premium purchase restored successfully.");
                } else {
                  Alert.alert(
                    "No Purchases Found",
                    authState === "guest"
                      ? "No active premium purchases were found for this guest session. If you purchased on another device, sign in with the same account and try restore again."
                      : "No active premium purchases were found for this account.",
                  );
                }
              } catch (error) {
                Alert.alert(
                  "Restore Failed",
                  error instanceof Error
                    ? error.message
                    : "Unable to restore purchases.",
                );
              }
            }}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text style={styles.secondaryText}>Restore Purchases</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryRow}
            onPress={async () => {
              try {
                await billingService.openManageSubscriptionPortal();
              } catch (error) {
                Alert.alert(
                  "Manage Subscription",
                  error instanceof Error
                    ? error.message
                    : "Unable to open subscription settings.",
                );
              }
            }}
          >
            <Ionicons name="card" size={20} color={colors.primary} />
            <Text style={styles.secondaryText}>Manage Subscription</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    hero: {
      padding: spacing.lg,
      alignItems: "center",
      gap: spacing.sm,
    },
    heroTitle: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "700",
      textAlign: "center",
    },
    heroSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 22,
    },
    statusText: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: "center",
    },
    planCard: {
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    planHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.md,
    },
    planTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    planSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    planPrice: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    ctaButton: {
      marginTop: spacing.sm,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    ctaText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
    secondaryCard: {
      paddingVertical: spacing.xs,
    },
    secondaryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    secondaryText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
  });
