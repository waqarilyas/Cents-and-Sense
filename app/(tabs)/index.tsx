import { useCallback, useState, useMemo, useEffect } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Text } from "react-native-paper";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAccounts } from "../../lib/contexts/AccountContext";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useBudgets } from "../../lib/contexts/BudgetContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useSubscriptions } from "../../lib/contexts/SubscriptionContext";
import { colors, spacing, borderRadius, formatCurrency, formatShortDate } from "../../lib/theme";
import { Card, LoadingState } from "../../lib/components";
import { getCategoryIcon } from "../../lib/smartCategories";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getTotalBalance, loading: accountsLoading, refreshAccounts } = useAccounts();
  const { transactions, loading: transactionsLoading, getMonthlyStats, refreshTransactions } = useTransactions();
  const { budgets } = useBudgets();
  const { getCategory } = useCategories();
  const { getUpcomingSubscriptions, processDueSubscriptions, refreshSubscriptions } = useSubscriptions();
  const [refreshing, setRefreshing] = useState(false);

  const monthlyStats = getMonthlyStats();
  const upcomingSubscriptions = getUpcomingSubscriptions(7);

  // Process due subscriptions on mount
  useEffect(() => {
    processDueSubscriptions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAccounts();
      refreshTransactions();
      refreshSubscriptions();
    }, [refreshAccounts, refreshTransactions, refreshSubscriptions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAccounts(), refreshTransactions(), refreshSubscriptions()]);
    await processDueSubscriptions();
    setRefreshing(false);
  }, [refreshAccounts, refreshTransactions, refreshSubscriptions, processDueSubscriptions]);

  // Get insight message
  const getInsight = useMemo(() => {
    const savings = monthlyStats.income - monthlyStats.expense;
    const savingsRate = monthlyStats.income > 0 ? (savings / monthlyStats.income) * 100 : 0;
    
    if (transactions.length === 0) {
      return { icon: "sparkles", message: "Start tracking your expenses!", color: colors.primary };
    }
    
    if (savingsRate >= 20) {
      return { icon: "trending-up", message: `Great! You're saving ${savingsRate.toFixed(0)}% this month`, color: colors.income };
    } else if (savingsRate >= 0) {
      return { icon: "checkmark-circle", message: `You've saved ${formatCurrency(savings)} this month`, color: colors.income };
    } else {
      return { icon: "warning", message: `You've overspent by ${formatCurrency(Math.abs(savings))}`, color: colors.expense };
    }
  }, [monthlyStats, transactions]);

  // Budget alert
  const budgetAlert = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    for (const budget of budgets) {
      const spent = transactions
        .filter(t => t.categoryId === budget.categoryId && t.type === 'expense' && t.date >= monthStart)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const percentage = (spent / budget.budget_limit) * 100;
      if (percentage >= 90) {
        const category = getCategory(budget.categoryId);
        return {
          name: category?.name || 'Budget',
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

  if (accountsLoading || transactionsLoading) {
    return <LoadingState />;
  }

  const totalBalance = getTotalBalance();

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Get month name
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Premium Header with Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>{getGreeting()} 👋</Text>
            <Text style={styles.headerTitle}>Your Finances</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(totalBalance)}</Text>
          
          {/* Income/Expense Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.statLabel}>Income</Text>
                <Text style={styles.statValueLight}>
                  +{formatCurrency(monthlyStats.income)}
                </Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.statLabel}>Expenses</Text>
                <Text style={styles.statValueLight}>
                  -{formatCurrency(monthlyStats.expense)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Quick Access Shortcuts */}
        <View style={styles.quickAccessRow}>
          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => router.push("/(tabs)/accounts")}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="wallet-outline" size={22} color={colors.accent} />
            </View>
            <Text style={styles.quickAccessLabel}>Accounts</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => router.push("/(tabs)/budgets")}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="pie-chart-outline" size={22} color={colors.warning} />
            </View>
            <Text style={styles.quickAccessLabel}>Budgets</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => router.push("/(tabs)/subscriptions")}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="repeat-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickAccessLabel}>Subscriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => router.push("/(tabs)/analysis")}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: colors.income + '15' }]}>
              <Ionicons name="stats-chart-outline" size={22} color={colors.income} />
            </View>
            <Text style={styles.quickAccessLabel}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Insight Card */}
        <View style={[styles.insightCard, { borderLeftColor: getInsight.color }]}>
          <Ionicons name={getInsight.icon as any} size={24} color={getInsight.color} />
          <Text style={styles.insightText}>{getInsight.message}</Text>
        </View>

        {/* Budget Alert */}
        {budgetAlert && (
          <TouchableOpacity 
            style={[styles.alertCard, budgetAlert.isOver && styles.alertCardDanger]}
            onPress={() => router.push("/(tabs)/budgets")}
          >
            <Ionicons 
              name={budgetAlert.isOver ? "alert-circle" : "warning"} 
              size={24} 
              color={budgetAlert.isOver ? colors.expense : "#F59E0B"} 
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {budgetAlert.isOver ? `Over budget!` : `${budgetAlert.name} budget at ${budgetAlert.percentage.toFixed(0)}%`}
              </Text>
              <View style={styles.alertProgressBg}>
                <View 
                  style={[
                    styles.alertProgress, 
                    { 
                      width: `${Math.min(budgetAlert.percentage, 100)}%`,
                      backgroundColor: budgetAlert.isOver ? colors.expense : "#F59E0B"
                    }
                  ]} 
                />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Upcoming Subscriptions */}
        {upcomingSubscriptions.length > 0 && (
          <TouchableOpacity 
            style={styles.subscriptionAlert}
            onPress={() => router.push("/(tabs)/subscriptions")}
          >
            <View style={styles.subscriptionIcon}>
              <Ionicons name="repeat" size={20} color={colors.primary} />
            </View>
            <View style={styles.subscriptionContent}>
              <Text style={styles.subscriptionTitle}>
                {upcomingSubscriptions.length} subscription{upcomingSubscriptions.length > 1 ? 's' : ''} due this week
              </Text>
              <Text style={styles.subscriptionSubtitle}>
                {upcomingSubscriptions.slice(0, 2).map(s => s.name).join(', ')}
                {upcomingSubscriptions.length > 2 ? ` +${upcomingSubscriptions.length - 2} more` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
              <Text style={styles.sectionAction}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => {
              const category = getCategory(transaction.categoryId);
              const categoryIcon = category ? getCategoryIcon(category.name) : 'ellipsis-horizontal';
              const categoryColor = category?.color || (transaction.type === 'income' ? colors.income : colors.expense);
              return (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: categoryColor + '15' }
                  ]}>
                    <Ionicons 
                      name={categoryIcon} 
                      size={20} 
                      color={categoryColor} 
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>
                      {transaction.description || category?.name || 'Transaction'}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatShortDate(transaction.date)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'income' ? colors.income : colors.expense }
                  ]}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyDescription}>
                Tap the + button below to add your first expense
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

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  headerGreeting: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
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
    alignItems: 'center',
    justifyContent: 'center',
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
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statValueLight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: spacing.md,
  },
  quickAccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  quickAccessItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickAccessLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '500',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  alertCardDanger: {
    backgroundColor: '#FEE2E2',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  alertProgressBg: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
  },
  alertProgress: {
    height: 4,
    borderRadius: 2,
  },
  subscriptionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionContent: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  transactionDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
