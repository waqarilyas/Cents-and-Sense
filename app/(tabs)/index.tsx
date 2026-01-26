import { useCallback, useState, useMemo, useEffect } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAccounts } from "../../lib/contexts/AccountContext";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useBudgets } from "../../lib/contexts/BudgetContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useSubscriptions } from "../../lib/contexts/SubscriptionContext";
import { useSettings } from "../../lib/contexts/SettingsContext";
import { useGoals } from "../../lib/contexts/GoalContext";
import { useUser } from "../../lib/contexts/UserContext";
import {
  getTotalBalanceByCurrency,
  getMonthlyStatsByCurrency,
  formatCurrencyAmount,
} from "../../lib/utils/currencyHelpers";
import {
  spacing,
  borderRadius,
  formatCurrency,
  formatShortDate,
} from "../../lib/theme";
import { useThemeColors, ThemeColors } from "../../lib/theme";
import { Card, LoadingState } from "../../lib/components";
import { getCategoryIcon } from "../../lib/smartCategories";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const {
    accounts,
    getTotalBalance,
    loading: accountsLoading,
    refreshAccounts,
  } = useAccounts();
  const {
    transactions,
    loading: transactionsLoading,
    getMonthlyStats,
    refreshTransactions,
  } = useTransactions();
  const {
    getUpcomingSubscriptions,
    processDueSubscriptions,
    refreshSubscriptions,
    approvePendingSubscription,
    skipPendingSubscription,
    pendingSubscriptions,
    approveAllPending,
  } = useSubscriptions();
  const { budgets } = useBudgets();
  const { getCategory } = useCategories();
  const { goals } = useGoals();
  const { settings } = useSettings();
  const { userProfile } = useUser();

  const balancesByCurrency = getTotalBalanceByCurrency(accounts);
  const monthlyStats = getMonthlyStats();
  const monthlyStatsByCurrency = getMonthlyStatsByCurrency(transactions);
  const upcomingSubscriptions = getUpcomingSubscriptions(7);

  // Process due subscriptions on mount based on settings
  useEffect(() => {
    processDueSubscriptions(settings.subscriptionProcessingMode);
  }, [settings.subscriptionProcessingMode]);

  useFocusEffect(
    useCallback(() => {
      refreshAccounts();
      refreshTransactions();
      refreshSubscriptions();
      // Check for due subscriptions when screen focuses
      processDueSubscriptions(settings.subscriptionProcessingMode);
    }, [
      refreshAccounts,
      refreshTransactions,
      refreshSubscriptions,
      settings.subscriptionProcessingMode,
    ]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshAccounts(),
      refreshTransactions(),
      refreshSubscriptions(),
    ]);
    await processDueSubscriptions(settings.subscriptionProcessingMode);
    setRefreshing(false);
  }, [
    refreshAccounts,
    refreshTransactions,
    refreshSubscriptions,
    processDueSubscriptions,
    settings.subscriptionProcessingMode,
  ]);

  // Handle approving a pending subscription
  const handleApprovePending = useCallback(
    async (subscriptionId: string, subscriptionName: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Add Subscription Expense",
        `Add ${subscriptionName} to your expenses?`,
        [
          {
            text: "Skip This Time",
            style: "destructive",
            onPress: async () => {
              await skipPendingSubscription(subscriptionId);
              refreshTransactions();
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Add Expense",
            onPress: async () => {
              await approvePendingSubscription(subscriptionId);
              refreshTransactions();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            },
          },
        ],
      );
    },
    [approvePendingSubscription, skipPendingSubscription, refreshTransactions],
  );

  // Handle approving all pending subscriptions
  const handleApproveAllPending = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const totalAmount = pendingSubscriptions.reduce(
      (sum, p) => sum + p.subscription.amount,
      0,
    );
    Alert.alert(
      "Add All Subscription Expenses",
      `Add ${pendingSubscriptions.length} subscriptions (${formatCurrency(totalAmount)}) to your expenses?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Add All",
          onPress: async () => {
            const count = await approveAllPending();
            refreshTransactions();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Done", `Added ${count} subscription expenses`);
          },
        },
      ],
    );
  }, [pendingSubscriptions, approveAllPending, refreshTransactions]);

  // Get insight message
  const getInsight = useMemo(() => {
    const savings = monthlyStats.income - monthlyStats.expense;
    const savingsRate =
      monthlyStats.income > 0 ? (savings / monthlyStats.income) * 100 : 0;

    if (transactions.length === 0) {
      return {
        icon: "sparkles",
        message: "Start tracking your expenses!",
        color: colors.primary,
      };
    }

    if (savingsRate >= 20) {
      return {
        icon: "trending-up",
        message: `Great! You're saving ${savingsRate.toFixed(0)}% this month`,
        color: colors.income,
      };
    } else if (savingsRate >= 0) {
      return {
        icon: "checkmark-circle",
        message: `You've saved ${formatCurrency(savings)} this month`,
        color: colors.income,
      };
    } else {
      return {
        icon: "warning",
        message: `You've overspent by ${formatCurrency(Math.abs(savings))}`,
        color: colors.expense,
      };
    }
  }, [monthlyStats, transactions]);

  // Budget alert
  const budgetAlert = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    for (const budget of budgets) {
      const spent = transactions
        .filter(
          (t) =>
            t.categoryId === budget.categoryId &&
            t.type === "expense" &&
            t.date >= monthStart,
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = (spent / budget.budget_limit) * 100;
      if (percentage >= 90) {
        const category = getCategory(budget.categoryId);
        return {
          name: category?.name || "Budget",
          percentage: Math.min(percentage, 100),
          isOver: percentage > 100,
        };
      }
    }
    return null;
  }, [budgets, transactions, getCategory]);

  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.date - a.date).slice(0, 5);
  }, [transactions]);

  const unlinkedBalance = useMemo(() => {
    return transactions
      .filter((t) => !t.accountId)
      .reduce(
        (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
        0,
      );
  }, [transactions]);

  // Active goals summary
  const activeGoals = useMemo(() => {
    return goals
      .filter((g) => g.currentAmount < g.targetAmount)
      .sort((a, b) => {
        // Sort by closest to completion first
        const aProgress = a.currentAmount / a.targetAmount;
        const bProgress = b.currentAmount / b.targetAmount;
        return bProgress - aProgress;
      })
      .slice(0, 3);
  }, [goals]);

  if (accountsLoading || transactionsLoading) {
    return <LoadingState />;
  }

  const accountBalance = getTotalBalance();
  const totalBalance = accountBalance + unlinkedBalance;

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Get month name
  const currentMonth = new Date().toLocaleDateString("en-US", {
    month: "long",
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Premium Header with Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>{getGreeting()}</Text>
            <Text style={styles.headerTitle}>
              {userProfile?.name ? userProfile.name : "Your Finances"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/(stack)/profile")}
          >
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Balances</Text>
          
          {/* Per-Currency Balances */}
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {Object.entries(balancesByCurrency).map(([currency, balance]) => (
              <View key={currency} style={styles.currencyBalanceRow}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>{currency}</Text>
                </View>
                <Text style={styles.currencyBalanceAmount}>
                  {formatCurrencyAmount(balance, currency)}
                </Text>
              </View>
            ))}
            {Object.keys(balancesByCurrency).length === 0 && (
              <Text style={styles.noBalanceText}>No accounts yet</Text>
            )}
          </View>

          {/* Income/Expense Per Currency */}
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Text style={[styles.balanceLabel, { fontSize: 14 }]}>This Month</Text>
            {Object.entries(monthlyStatsByCurrency).map(([currency, stats]) => (
              <View key={currency} style={styles.monthlyStatsRow}>
                <View style={styles.currencyBadgeSmall}>
                  <Text style={styles.currencyBadgeTextSmall}>{currency}</Text>
                </View>
                <View style={styles.statsInlineRow}>
                  <View style={styles.statInline}>
                    <Ionicons name="arrow-down" size={14} color={colors.income} />
                    <Text style={[styles.statInlineText, { color: colors.income }]}>
                      {formatCurrencyAmount(stats.income, currency)}
                    </Text>
                  </View>
                  <View style={styles.statInline}>
                    <Ionicons name="arrow-up" size={14} color={colors.expense} />
                    <Text style={[styles.statInlineText, { color: colors.expense }]}>
                      {formatCurrencyAmount(stats.expense, currency)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {Object.keys(monthlyStatsByCurrency).length === 0 && (
              <Text style={styles.noDataText}>No transactions this month</Text>
            )}
          </View>
        </Card>

        {/* Quick Access Shortcuts - Row 1 */}
        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => router.push("/(stack)/accounts")}
          >
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: colors.accent + "15" },
              ]}
            >
              <Ionicons name="wallet-outline" size={22} color={colors.accent} />
            </View>
            <Text style={styles.quickAccessLabel}>Accounts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => router.push("/(stack)/budgets")}
          >
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: colors.warning + "15" },
              ]}
            >
              <Ionicons
                name="pie-chart-outline"
                size={22}
                color={colors.warning}
              />
            </View>
            <Text style={styles.quickAccessLabel}>Budgets</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => router.push("/(stack)/goals")}
          >
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: colors.success + "15" },
              ]}
            >
              <Ionicons name="flag-outline" size={22} color={colors.success} />
            </View>
            <Text style={styles.quickAccessLabel}>Goals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => router.push("/(stack)/subscriptions")}
          >
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons
                name="repeat-outline"
                size={22}
                color={colors.primary}
              />
            </View>
            <Text style={styles.quickAccessLabel}>Subscriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => router.push("/(stack)/analysis")}
          >
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: colors.income + "15" },
              ]}
            >
              <Ionicons
                name="stats-chart-outline"
                size={22}
                color={colors.income}
              />
            </View>
            <Text style={styles.quickAccessLabel}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Insight Card */}
        <View
          style={[styles.insightCard, { borderLeftColor: getInsight.color }]}
        >
          <Ionicons
            name={getInsight.icon as any}
            size={24}
            color={getInsight.color}
          />
          <Text style={styles.insightText}>{getInsight.message}</Text>
        </View>

        {/* Budget Alert */}
        {budgetAlert && (
          <TouchableOpacity
            style={[
              styles.alertCard,
              budgetAlert.isOver && styles.alertCardDanger,
            ]}
            onPress={() => router.push("/(stack)/budgets")}
          >
            <Ionicons
              name={budgetAlert.isOver ? "alert-circle" : "warning"}
              size={24}
              color={budgetAlert.isOver ? colors.expense : "#F59E0B"}
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {budgetAlert.isOver
                  ? `Over budget!`
                  : `${budgetAlert.name} budget at ${budgetAlert.percentage.toFixed(0)}%`}
              </Text>
              <View style={styles.alertProgressBg}>
                <View
                  style={[
                    styles.alertProgress,
                    {
                      width: `${Math.min(budgetAlert.percentage, 100)}%`,
                      backgroundColor: budgetAlert.isOver
                        ? colors.expense
                        : "#F59E0B",
                    },
                  ]}
                />
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {/* Pending Subscriptions - Need User Approval */}
        {pendingSubscriptions.length > 0 && (
          <View style={styles.pendingSection}>
            <View style={styles.pendingHeader}>
              <View style={styles.pendingTitleRow}>
                <View style={styles.pendingIconBadge}>
                  <Ionicons name="time" size={18} color="#FFF" />
                </View>
                <Text style={styles.pendingTitle}>
                  {pendingSubscriptions.length} Subscription
                  {pendingSubscriptions.length > 1 ? "s" : ""} Due
                </Text>
              </View>
              {pendingSubscriptions.length > 1 && (
                <TouchableOpacity
                  style={styles.approveAllButton}
                  onPress={handleApproveAllPending}
                >
                  <Text style={styles.approveAllText}>Add All</Text>
                </TouchableOpacity>
              )}
            </View>
            {pendingSubscriptions.map((pending) => (
              <TouchableOpacity
                key={pending.subscription.id}
                style={styles.pendingItem}
                onPress={() =>
                  handleApprovePending(
                    pending.subscription.id,
                    pending.subscription.name,
                  )
                }
              >
                <View style={styles.pendingItemIcon}>
                  <Ionicons name="repeat" size={18} color={colors.warning} />
                </View>
                <View style={styles.pendingItemContent}>
                  <Text style={styles.pendingItemName}>
                    {pending.subscription.name}
                  </Text>
                  <Text style={styles.pendingItemDate}>
                    Due {formatShortDate(pending.dueDate)}
                  </Text>
                </View>
                <Text style={styles.pendingItemAmount}>
                  {formatCurrency(
                    pending.subscription.amount,
                    pending.subscription.currency,
                  )}
                </Text>
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Subscriptions */}
        {upcomingSubscriptions.length > 0 && (
          <TouchableOpacity
            style={styles.subscriptionAlert}
            onPress={() => router.push("/(stack)/subscriptions")}
          >
            <View style={styles.subscriptionIcon}>
              <Ionicons name="repeat" size={20} color={colors.primary} />
            </View>
            <View style={styles.subscriptionContent}>
              <Text style={styles.subscriptionTitle}>
                {upcomingSubscriptions.length} subscription
                {upcomingSubscriptions.length > 1 ? "s" : ""} due this week
              </Text>
              <Text style={styles.subscriptionSubtitle}>
                {upcomingSubscriptions
                  .slice(0, 2)
                  .map((s) => s.name)
                  .join(", ")}
                {upcomingSubscriptions.length > 2
                  ? ` +${upcomingSubscriptions.length - 2} more`
                  : ""}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {/* Goals Progress */}
        {activeGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Goals Progress</Text>
              <TouchableOpacity onPress={() => router.push("/(stack)/goals")}>
                <Text style={styles.sectionAction}>See All</Text>
              </TouchableOpacity>
            </View>
            {activeGoals.map((goal) => {
              const progress = Math.min(
                (goal.currentAmount / goal.targetAmount) * 100,
                100,
              );
              const remaining = goal.targetAmount - goal.currentAmount;
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalItem}
                  onPress={() => router.push("/(stack)/goals")}
                >
                  <View style={styles.goalHeader}>
                    <View style={styles.goalInfo}>
                      <View style={styles.goalIconContainer}>
                        <Ionicons
                          name="flag"
                          size={18}
                          color={colors.success}
                        />
                      </View>
                      <Text style={styles.goalName}>{goal.name}</Text>
                    </View>
                    <Text style={styles.goalProgress}>
                      {progress.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.goalProgressBar}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        { width: `${progress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.goalRemaining}>
                    {formatCurrency(remaining)} remaining
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push("/history")}>
              <Text style={styles.sectionAction}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => {
              const category = getCategory(transaction.categoryId);
              const categoryIcon = category
                ? getCategoryIcon(category.name)
                : "ellipsis-horizontal";
              const categoryColor =
                category?.color ||
                (transaction.type === "income"
                  ? colors.income
                  : colors.expense);
              return (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View
                    style={[
                      styles.transactionIcon,
                      { backgroundColor: categoryColor + "15" },
                    ]}
                  >
                    <Ionicons
                      name={categoryIcon}
                      size={20}
                      color={categoryColor}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>
                      {transaction.description ||
                        category?.name ||
                        "Transaction"}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatShortDate(transaction.date)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          transaction.type === "income"
                            ? colors.income
                            : colors.expense,
                      },
                    ]}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyDescription}>
                Add a transaction to get started.
              </Text>
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 140 }} />
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    headerGreeting: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    profileButton: {
      padding: spacing.xs,
    },
    profileAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.primary,
    },
    balanceCard: {
      backgroundColor: colors.primary,
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    balanceLabel: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
      marginBottom: spacing.xs,
      fontWeight: "600",
    },
    currencyBalanceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.xs,
    },
    currencyBadge: {
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 6,
    },
    currencyBadgeText: {
      color: colors.textInverse,
      fontSize: 12,
      fontWeight: "700",
    },
    currencyBalanceAmount: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textInverse,
    },
    noBalanceText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      paddingVertical: spacing.md,
    },
    monthlyStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 4,
    },
    currencyBadgeSmall: {
      backgroundColor: "rgba(255,255,255,0.15)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      minWidth: 40,
      alignItems: "center",
    },
    currencyBadgeTextSmall: {
      color: colors.textInverse,
      fontSize: 10,
      fontWeight: "600",
    },
    statsInlineRow: {
      flexDirection: "row",
      gap: spacing.md,
      flex: 1,
    },
    statInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statInlineText: {
      fontSize: 13,
      fontWeight: "600",
    },
    noDataText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
      paddingVertical: spacing.sm,
    },
    balanceAmount: {
      fontSize: 40,
      fontWeight: "700",
      color: colors.textInverse,
      marginBottom: spacing.lg,
    },
    balanceBreakdown: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    balanceBreakdownText: {
      fontSize: 12,
      color: "rgba(255,255,255,0.85)",
      fontWeight: "500",
    },
    balanceBreakdownSeparator: {
      fontSize: 12,
      color: "rgba(255,255,255,0.6)",
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    statItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    statIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    statLabel: {
      fontSize: 12,
      color: "rgba(255,255,255,0.7)",
    },
    statValue: {
      fontSize: 16,
      fontWeight: "600",
    },
    statValueLight: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textInverse,
    },
    statDivider: {
      width: 1,
      height: 36,
      backgroundColor: colors.border,
      marginHorizontal: spacing.md,
    },
    quickAccessRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    quickAccessItem: {
      alignItems: "center",
      flex: 1,
    },
    quickAccessIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xs,
    },
    quickAccessLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    insightCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
      borderLeftWidth: 4,
      gap: spacing.md,
    },
    insightText: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: "500",
    },
    alertCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.warning + "20",
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    alertCardDanger: {
      backgroundColor: colors.expense + "20",
    },
    alertContent: {
      flex: 1,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    alertProgressBg: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
    },
    alertProgress: {
      height: 4,
      borderRadius: 2,
    },
    pendingSection: {
      backgroundColor: colors.warning + "20",
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    pendingHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    pendingTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    pendingIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.warning,
      alignItems: "center",
      justifyContent: "center",
    },
    pendingTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    approveAllButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
    },
    approveAllText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textInverse,
    },
    pendingItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      marginTop: spacing.xs,
      gap: spacing.sm,
    },
    pendingItemIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.warning + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    pendingItemContent: {
      flex: 1,
    },
    pendingItemName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    pendingItemDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    pendingItemAmount: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.expense,
      marginRight: spacing.xs,
    },
    subscriptionAlert: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    subscriptionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    subscriptionContent: {
      flex: 1,
    },
    subscriptionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    subscriptionSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    section: {
      marginTop: spacing.sm,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    sectionAction: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
    },
    transactionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    transactionInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    transactionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    transactionDate: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: "700",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: spacing.xxxl,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: "center",
      paddingHorizontal: spacing.xl,
    },
    goalItem: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    goalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    goalInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    goalIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.success + "15",
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.sm,
    },
    goalName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
      flex: 1,
    },
    goalProgress: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.success,
    },
    goalProgressBar: {
      height: 6,
      backgroundColor: colors.surface,
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    goalProgressFill: {
      height: "100%",
      backgroundColor: colors.success,
      borderRadius: 3,
    },
    goalRemaining: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });
