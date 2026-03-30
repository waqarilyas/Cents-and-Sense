import { useMemo } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAccounts } from "../../lib/contexts/AccountContext";
import { useBudgets } from "../../lib/contexts/BudgetContext";
import { useGoals } from "../../lib/contexts/GoalContext";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useSubscriptions } from "../../lib/contexts/SubscriptionContext";
import { useFeatureFlags } from "../../lib/contexts/FeatureFlagsContext";
import { Card } from "../../lib/components";
import {
  spacing,
  borderRadius,
  useThemeColors,
  ThemeColors,
} from "../../lib/theme";
import { AppIcon, AppIconName } from "../../lib/icons";
import { Ionicons } from "@expo/vector-icons";

const DESTINATIONS = [
  {
    title: "Accounts",
    subtitle: "Balances and defaults",
    icon: "accounts" as AppIconName,
    route: "/(stack)/accounts",
    key: "accounts",
  },
  {
    title: "Budgets",
    subtitle: "Limits and carryover",
    icon: "budgets" as AppIconName,
    route: "/(stack)/budgets",
    key: "budgets",
  },
  {
    title: "Goals",
    subtitle: "Savings progress",
    icon: "goals" as AppIconName,
    route: "/(stack)/goals",
    key: "goals",
  },
  {
    title: "Transactions",
    subtitle: "All income and expenses",
    icon: "transactions" as AppIconName,
    route: "/(stack)/transactions",
    key: "transactions",
  },
  {
    title: "Categories",
    subtitle: "Income and expense groups",
    icon: "categories" as AppIconName,
    route: "/(stack)/categories",
    key: "categories",
  },
  {
    title: "Subscriptions",
    subtitle: "Recurring payments",
    icon: "subscriptions" as AppIconName,
    route: "/(stack)/subscriptions",
    key: "subscriptions",
  },
  {
    title: "Analytics",
    subtitle: "Trends and insights",
    icon: "analytics" as AppIconName,
    route: "/(stack)/analysis",
    key: "analytics",
  },
  {
    title: "Settings",
    subtitle: "Preferences and sync",
    icon: "settings" as AppIconName,
    route: "/(stack)/settings",
    key: "settings",
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { flags } = useFeatureFlags();
  const { accounts } = useAccounts();
  const { budgets } = useBudgets();
  const { goals } = useGoals();
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { subscriptions } = useSubscriptions();

  const visibleDestinations = useMemo(
    () =>
      DESTINATIONS.filter((item) => {
        if (item.key === "analytics" && !flags.analyticsEnabled) {
          return false;
        }
        return true;
      }),
    [flags.analyticsEnabled],
  );

  const destinationMetrics: Record<string, string> = {
    accounts: `${accounts.length} total`,
    budgets: `${budgets.length} active`,
    goals: `${goals.length} tracked`,
    transactions: `${transactions.length} entries`,
    categories: `${categories.length} groups`,
    subscriptions: `${subscriptions.length} recurring`,
    analytics: "Insights ready",
    settings: "Appearance and app data",
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>All core tools in one place</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="grid" size={16} color={colors.primary} />
              <Text style={styles.heroBadgeText}>Workspace</Text>
            </View>
              <Text style={styles.heroMeta}>{visibleDestinations.length} destinations</Text>
          </View>
          <Text style={styles.heroTitle}>Manage every part of your money flow</Text>
          <Text style={styles.heroDescription}>
            Jump straight into accounts, budgets, categories, recurring payments,
            and analysis without digging through the app.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{accounts.length}</Text>
              <Text style={styles.heroStatLabel}>Accounts</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{transactions.length}</Text>
              <Text style={styles.heroStatLabel}>Transactions</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{categories.length}</Text>
              <Text style={styles.heroStatLabel}>Categories</Text>
            </View>
          </View>
        </Card>

        <View style={styles.grid}>
          {visibleDestinations.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.cardWrapper}
              onPress={() => router.push(item.route)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
            >
              <Card style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.iconWrap}>
                    <AppIcon name={item.icon} size="card" color={colors.primary} />
                  </View>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
                <Text style={styles.cardEyebrow}>{destinationMetrics[item.key]}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardAction}>Open</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={colors.primary}
                  />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 120 }} />
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
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 120,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    heroCard: {
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    heroBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: colors.primaryLight,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
    },
    heroBadgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
    },
    heroMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.textPrimary,
      lineHeight: 30,
    },
    heroDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginTop: spacing.sm,
    },
    heroStats: {
      flexDirection: "row",
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    heroStat: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    },
    heroStatValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    heroStatLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    cardWrapper: {
      width: "47%",
    },
    card: {
      minHeight: 168,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.lg,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
    },
    cardEyebrow: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      lineHeight: 18,
    },
    cardFooter: {
      marginTop: "auto",
      paddingTop: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardAction: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },
  });
