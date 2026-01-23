import { useState, useMemo, useCallback } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useBudgets } from "../../lib/contexts/BudgetContext";
import { useSubscriptions } from "../../lib/contexts/SubscriptionContext";
import { useAccounts } from "../../lib/contexts/AccountContext";
import { useGoals } from "../../lib/contexts/GoalContext";
import {
  colors,
  spacing,
  borderRadius,
  formatCurrency,
  categoryConfig,
} from "../../lib/theme";
import { Card, LoadingState } from "../../lib/components";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const { width } = Dimensions.get("window");

type Period = "week" | "month" | "quarter" | "year";
type AnalyticsTab = "overview" | "spending" | "trends" | "insights";

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    transactions,
    loading: txLoading,
    refreshTransactions,
  } = useTransactions();
  const { categories, loading: catLoading } = useCategories();
  const { budgets } = useBudgets();
  const { subscriptions, getMonthlyTotal: getSubscriptionMonthly } =
    useSubscriptions();
  const { accounts, getTotalBalance } = useAccounts();
  const { goals } = useGoals();

  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [refreshing, setRefreshing] = useState(false);

  const hapticFeedback = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  }, [refreshTransactions]);

  const periodRange = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);

    switch (selectedPeriod) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setFullYear(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    startDate.setHours(0, 0, 0, 0);

    return {
      start: startDate.getTime(),
      end: now.getTime(),
    };
  }, [selectedPeriod]);

  const previousPeriodRange = useMemo(() => {
    const duration = periodRange.end - periodRange.start;
    const end = periodRange.start;
    const start = end - duration;

    return { start, end };
  }, [periodRange]);

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.date >= periodRange.start && t.date <= periodRange.end,
    );
  }, [transactions, periodRange]);

  // Previous period transactions for comparison
  const previousPeriodTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.date >= previousPeriodRange.start && t.date < previousPeriodRange.end,
    );
  }, [transactions, previousPeriodRange]);

  // Core stats
  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    // Previous period for comparison
    const prevIncome = previousPeriodTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const prevExpenses = previousPeriodTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const incomeChange =
      prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
    const expenseChange =
      prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;

    return {
      income,
      expenses,
      savings,
      savingsRate,
      incomeChange,
      expenseChange,
      prevIncome,
      prevExpenses,
    };
  }, [filteredTransactions, previousPeriodTransactions]);

  const periodMonths = useMemo(() => {
    switch (selectedPeriod) {
      case "week":
        return 7 / 30.44;
      case "month":
        return 1;
      case "quarter":
        return 3;
      case "year":
        return 12;
    }
  }, [selectedPeriod]);

  const accountsSummary = useMemo(() => {
    const totalBalance = getTotalBalance();
    const positiveCount = accounts.filter((a) => a.balance > 0).length;
    const negativeCount = accounts.filter((a) => a.balance < 0).length;

    return {
      totalBalance,
      count: accounts.length,
      positiveCount,
      negativeCount,
    };
  }, [accounts, getTotalBalance]);

  const goalsSummary = useMemo(() => {
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const completedCount = goals.filter(
      (g) => g.currentAmount >= g.targetAmount,
    ).length;
    const activeGoals = goals
      .filter((g) => g.currentAmount < g.targetAmount)
      .sort((a, b) => a.deadline - b.deadline);

    return {
      totalTarget,
      totalSaved,
      completedCount,
      activeCount: activeGoals.length,
      completionRate: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
      nextGoal: activeGoals[0],
    };
  }, [goals]);

  const subscriptionsSummary = useMemo(() => {
    const activeSubscriptions = subscriptions.filter((s) => s.isActive);
    const monthlyTotal = getSubscriptionMonthly();

    return {
      activeCount: activeSubscriptions.length,
      monthlyTotal,
      periodTotal: monthlyTotal * periodMonths,
    };
  }, [subscriptions, getSubscriptionMonthly, periodMonths]);

  const budgetsSummary = useMemo(() => {
    const monthlyBudgetTotal = budgets.reduce((sum, budget) => {
      return (
        sum +
        (budget.period === "monthly"
          ? budget.budget_limit
          : budget.budget_limit / 12)
      );
    }, 0);

    const budgetForPeriod = monthlyBudgetTotal * periodMonths;

    const spentInPeriod = filteredTransactions
      .filter(
        (t) =>
          t.type === "expense" &&
          budgets.some((b) => b.categoryId === t.categoryId),
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const utilization =
      budgetForPeriod > 0 ? (spentInPeriod / budgetForPeriod) * 100 : 0;

    const budgetUsage = budgets
      .map((budget) => {
        const category = categories.find((c) => c.id === budget.categoryId);
        const periodLimit =
          (budget.period === "monthly"
            ? budget.budget_limit
            : budget.budget_limit / 12) * periodMonths;
        const spent = filteredTransactions
          .filter(
            (t) => t.type === "expense" && t.categoryId === budget.categoryId,
          )
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          id: budget.id,
          name: category?.name || "Budget",
          color: category?.color || colors.primary,
          spent,
          limit: periodLimit,
          percentage: periodLimit > 0 ? (spent / periodLimit) * 100 : 0,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    return {
      monthlyBudgetTotal,
      budgetForPeriod,
      spentInPeriod,
      utilization,
      budgetUsage,
    };
  }, [budgets, categories, filteredTransactions, periodMonths]);

  // Category breakdown with advanced metrics
  const categoryBreakdown = useMemo(() => {
    const expensesByCategory = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce(
        (acc, t) => {
          const cat = categories.find((c) => c.id === t.categoryId);
          const catName = cat?.name || "Uncategorized";
          const catColor = cat?.color || categoryConfig.colors[0];

          if (!acc[t.categoryId]) {
            acc[t.categoryId] = {
              id: t.categoryId,
              name: catName,
              amount: 0,
              color: catColor,
              count: 0,
              transactions: [],
            };
          }
          acc[t.categoryId].amount += t.amount;
          acc[t.categoryId].count += 1;
          acc[t.categoryId].transactions.push(t);
          return acc;
        },
        {} as Record<
          string,
          {
            id: string;
            name: string;
            amount: number;
            color: string;
            count: number;
            transactions: any[];
          }
        >,
      );

    // Previous period comparison
    const prevExpensesByCategory = previousPeriodTransactions
      .filter((t) => t.type === "expense")
      .reduce(
        (acc, t) => {
          if (!acc[t.categoryId]) acc[t.categoryId] = 0;
          acc[t.categoryId] += t.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

    return Object.values(expensesByCategory)
      .map((data) => {
        const prevAmount = prevExpensesByCategory[data.id] || 0;
        const change =
          prevAmount > 0 ? ((data.amount - prevAmount) / prevAmount) * 100 : 0;
        const avgTransaction = data.count > 0 ? data.amount / data.count : 0;

        return {
          ...data,
          percentage:
            stats.expenses > 0 ? (data.amount / stats.expenses) * 100 : 0,
          change,
          avgTransaction,
          prevAmount,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [
    filteredTransactions,
    previousPeriodTransactions,
    categories,
    stats.expenses,
  ]);

  // Daily spending trend
  const dailyTrend = useMemo(() => {
    const days =
      selectedPeriod === "week"
        ? 7
        : selectedPeriod === "month"
          ? 30
          : selectedPeriod === "quarter"
            ? 90
            : 12;
    const now = new Date();
    const trend: {
      label: string;
      fullDate: string;
      income: number;
      expense: number;
      net: number;
    }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);

      if (selectedPeriod === "year") {
        date.setMonth(now.getMonth() - i);
        const startOfMonth = new Date(
          date.getFullYear(),
          date.getMonth(),
          1,
        ).getTime();
        const endOfMonth = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
        ).getTime();

        const dayTransactions = transactions.filter(
          (t) => t.date >= startOfMonth && t.date <= endOfMonth,
        );

        const income = dayTransactions
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0);
        const expense = dayTransactions
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0);

        trend.push({
          label: date.toLocaleDateString("en-US", { month: "short" }),
          fullDate: date.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
          income,
          expense,
          net: income - expense,
        });
      } else {
        date.setDate(now.getDate() - i);
        const startOfDay = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        ).getTime();
        const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

        const dayTransactions = transactions.filter(
          (t) => t.date >= startOfDay && t.date < endOfDay,
        );

        const income = dayTransactions
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0);
        const expense = dayTransactions
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0);

        trend.push({
          label:
            selectedPeriod === "week"
              ? date.toLocaleDateString("en-US", { weekday: "short" }).charAt(0)
              : date.getDate().toString(),
          fullDate: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          income,
          expense,
          net: income - expense,
        });
      }
    }

    return trend;
  }, [transactions, selectedPeriod]);

  // Spending patterns analysis
  const spendingPatterns = useMemo(() => {
    const expenseTransactions = filteredTransactions.filter(
      (t) => t.type === "expense",
    );

    // Day of week analysis
    const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    expenseTransactions.forEach((t) => {
      const day = new Date(t.date).getDay();
      byDayOfWeek[day] += t.amount;
    });

    const highestSpendingDay = byDayOfWeek.indexOf(Math.max(...byDayOfWeek));
    const lowestSpendingDay = byDayOfWeek.indexOf(
      Math.min(...byDayOfWeek.filter((v) => v > 0)),
    );

    // Spending velocity (daily average)
    const daysInPeriod =
      selectedPeriod === "week"
        ? 7
        : selectedPeriod === "month"
          ? 30
          : selectedPeriod === "quarter"
            ? 90
            : 365;
    const dailyAvg = stats.expenses / daysInPeriod;
    const prevDailyAvg = stats.prevExpenses / daysInPeriod;

    // Top spending categories
    const topCategories = categoryBreakdown.slice(0, 3);

    return {
      byDayOfWeek,
      dayNames,
      highestSpendingDay: dayNames[highestSpendingDay],
      lowestSpendingDay: dayNames[lowestSpendingDay] || "N/A",
      dailyAvg,
      prevDailyAvg,
      topCategories,
      transactionCount: expenseTransactions.length,
    };
  }, [filteredTransactions, stats, categoryBreakdown, selectedPeriod]);

  // Financial health score
  const healthScore = useMemo(() => {
    let score = 50; // Base score

    // Savings rate contribution (max 30 points)
    if (stats.savingsRate >= 30) score += 30;
    else if (stats.savingsRate >= 20) score += 25;
    else if (stats.savingsRate >= 10) score += 15;
    else if (stats.savingsRate >= 0) score += 5;
    else score -= 10;

    // Budget adherence (max 20 points)
    const budgetedCategories = budgets.map((b) => b.categoryId);
    const budgetAdherence = budgets.filter((budget) => {
      const spent = filteredTransactions
        .filter(
          (t) => t.categoryId === budget.categoryId && t.type === "expense",
        )
        .reduce((sum, t) => sum + t.amount, 0);
      return spent <= budget.budget_limit;
    }).length;

    if (budgets.length > 0) {
      score += Math.round((budgetAdherence / budgets.length) * 20);
    } else {
      score += 10; // Neutral if no budgets set
    }

    return Math.min(100, Math.max(0, score));
  }, [stats, budgets, filteredTransactions]);

  // Smart insights
  const insights = useMemo(() => {
    const result: {
      type: "success" | "warning" | "info" | "tip";
      title: string;
      message: string;
      icon: keyof typeof Ionicons.glyphMap;
    }[] = [];

    // Savings insight
    if (stats.savingsRate >= 20) {
      result.push({
        type: "success",
        title: "Great Savings!",
        message: `You're saving ${stats.savingsRate.toFixed(0)}% of your income. Keep it up!`,
        icon: "trending-up",
      });
    } else if (stats.savingsRate < 0) {
      result.push({
        type: "warning",
        title: "Overspending Alert",
        message: `You've spent ${formatCurrency(Math.abs(stats.savings))} more than you earned this period.`,
        icon: "warning",
      });
    }

    // Expense change insight
    if (stats.expenseChange > 20) {
      result.push({
        type: "warning",
        title: "Spending Increase",
        message: `Your expenses are up ${stats.expenseChange.toFixed(0)}% compared to last period.`,
        icon: "arrow-up",
      });
    } else if (stats.expenseChange < -10) {
      result.push({
        type: "success",
        title: "Spending Decrease",
        message: `Great job! Expenses down ${Math.abs(stats.expenseChange).toFixed(0)}% from last period.`,
        icon: "arrow-down",
      });
    }

    // Category insights
    if (categoryBreakdown.length > 0) {
      const topCategory = categoryBreakdown[0];
      if (topCategory.percentage > 40) {
        result.push({
          type: "info",
          title: `${topCategory.name} Dominates`,
          message: `${topCategory.percentage.toFixed(0)}% of your spending goes to ${topCategory.name}. Consider diversifying.`,
          icon: "pie-chart",
        });
      }

      // Rising category
      const risingCategory = categoryBreakdown.find((c) => c.change > 50);
      if (risingCategory) {
        result.push({
          type: "warning",
          title: `${risingCategory.name} Surge`,
          message: `${risingCategory.name} spending up ${risingCategory.change.toFixed(0)}% this period.`,
          icon: "trending-up",
        });
      }
    }

    // Subscription tip
    const monthlySubscriptions = getSubscriptionMonthly();
    if (monthlySubscriptions > 0) {
      result.push({
        type: "tip",
        title: "Subscription Costs",
        message: `You have ${formatCurrency(monthlySubscriptions)} in monthly subscriptions. Review them periodically.`,
        icon: "repeat",
      });
    }

    // Budget utilization insight
    if (budgetsSummary.budgetForPeriod > 0) {
      if (budgetsSummary.utilization > 100) {
        result.push({
          type: "warning",
          title: "Over Budget",
          message: `You've used ${budgetsSummary.utilization.toFixed(0)}% of your budgeted amount this period.`,
          icon: "warning",
        });
      } else if (budgetsSummary.utilization > 85) {
        result.push({
          type: "info",
          title: "Budget Nearly Used",
          message: `You've used ${budgetsSummary.utilization.toFixed(0)}% of your budgeted amount this period.`,
          icon: "pie-chart",
        });
      }
    }

    // Goals insight
    if (goalsSummary.activeCount > 0) {
      const nextGoal = goalsSummary.nextGoal;
      result.push({
        type: "tip",
        title: "Goals Progress",
        message: nextGoal
          ? `You're ${goalsSummary.completionRate.toFixed(0)}% toward your targets. Next goal: ${nextGoal.name}.`
          : `You're ${goalsSummary.completionRate.toFixed(0)}% toward your targets.`,
        icon: "flag",
      });
    }

    // Accounts insight
    if (accountsSummary.negativeCount > 0) {
      result.push({
        type: "warning",
        title: "Negative Account Balances",
        message: `You have ${accountsSummary.negativeCount} account${accountsSummary.negativeCount > 1 ? "s" : ""} in the red.`,
        icon: "card",
      });
    }

    // Spending pattern tip
    if (spendingPatterns.highestSpendingDay) {
      result.push({
        type: "tip",
        title: "Spending Pattern",
        message: `You tend to spend most on ${spendingPatterns.highestSpendingDay}s. Plan accordingly!`,
        icon: "calendar",
      });
    }

    return result;
  }, [
    stats,
    categoryBreakdown,
    spendingPatterns,
    getSubscriptionMonthly,
    budgetsSummary,
    goalsSummary,
    accountsSummary,
  ]);

  const maxTrendValue = useMemo(() => {
    const max = Math.max(
      ...dailyTrend.map((d) => Math.max(d.income, d.expense)),
    );
    return max || 100;
  }, [dailyTrend]);

  if (txLoading || catLoading) {
    return <LoadingState />;
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "quarter":
        return "This Quarter";
      case "year":
        return "This Year";
    }
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0) return { icon: "arrow-up", color: colors.expense };
    if (change < 0) return { icon: "arrow-down", color: colors.income };
    return { icon: "remove", color: colors.textMuted };
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.premiumBadge}>
            <Ionicons name="diamond" size={12} color="#FFD700" />
            <Text style={styles.premiumBadgeText}>PRO</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>{getPeriodLabel()}</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(["week", "month", "quarter", "year"] as Period[]).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => {
              hapticFeedback();
              setSelectedPeriod(period);
            }}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {period === "week"
                ? "W"
                : period === "month"
                  ? "M"
                  : period === "quarter"
                    ? "3M"
                    : "Y"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {(
          [
            { id: "overview", label: "Overview", icon: "grid" },
            { id: "spending", label: "Spending", icon: "pie-chart" },
            { id: "trends", label: "Trends", icon: "trending-up" },
            { id: "insights", label: "Insights", icon: "bulb" },
          ] as {
            id: AnalyticsTab;
            label: string;
            icon: keyof typeof Ionicons.glyphMap;
          }[]
        ).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.tabButtonActive,
            ]}
            onPress={() => {
              hapticFeedback();
              setActiveTab(tab.id);
            }}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab.id && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* Financial Health Score */}
            <Card style={styles.healthScoreCard}>
              <View style={styles.healthScoreHeader}>
                <Text style={styles.healthScoreTitle}>
                  Financial Health Score
                </Text>
                <View style={styles.healthScoreBadge}>
                  <Text style={styles.healthScoreValue}>{healthScore}</Text>
                  <Text style={styles.healthScoreMax}>/100</Text>
                </View>
              </View>
              <View style={styles.healthScoreBar}>
                <View
                  style={[
                    styles.healthScoreBarFill,
                    {
                      width: `${healthScore}%`,
                      backgroundColor:
                        healthScore >= 70
                          ? colors.income
                          : healthScore >= 40
                            ? colors.warning
                            : colors.expense,
                    },
                  ]}
                />
              </View>
              <Text style={styles.healthScoreLabel}>
                {healthScore >= 70
                  ? "Excellent! Keep up the great work!"
                  : healthScore >= 40
                    ? "Good progress. Room for improvement."
                    : "Needs attention. Review your spending."}
              </Text>
            </Card>

            {/* Overview Cards */}
            <View style={styles.overviewGrid}>
              <Card style={[styles.overviewCard, styles.incomeCard]}>
                <View
                  style={[
                    styles.overviewIconContainer,
                    { backgroundColor: colors.incomeLight },
                  ]}
                >
                  <Ionicons name="arrow-down" size={20} color={colors.income} />
                </View>
                <Text style={styles.overviewLabel}>Income</Text>
                <Text style={[styles.overviewValue, { color: colors.income }]}>
                  {formatCurrency(stats.income)}
                </Text>
                {stats.incomeChange !== 0 && (
                  <View style={styles.changeIndicator}>
                    <Ionicons
                      name={getChangeIndicator(stats.incomeChange).icon as any}
                      size={12}
                      color={getChangeIndicator(stats.incomeChange).color}
                    />
                    <Text
                      style={[
                        styles.changeText,
                        { color: getChangeIndicator(stats.incomeChange).color },
                      ]}
                    >
                      {Math.abs(stats.incomeChange).toFixed(0)}%
                    </Text>
                  </View>
                )}
              </Card>
              <Card style={[styles.overviewCard, styles.expenseCard]}>
                <View
                  style={[
                    styles.overviewIconContainer,
                    { backgroundColor: colors.expenseLight },
                  ]}
                >
                  <Ionicons name="arrow-up" size={20} color={colors.expense} />
                </View>
                <Text style={styles.overviewLabel}>Expenses</Text>
                <Text style={[styles.overviewValue, { color: colors.expense }]}>
                  {formatCurrency(stats.expenses)}
                </Text>
                {stats.expenseChange !== 0 && (
                  <View style={styles.changeIndicator}>
                    <Ionicons
                      name={
                        getChangeIndicator(-stats.expenseChange).icon as any
                      }
                      size={12}
                      color={getChangeIndicator(-stats.expenseChange).color}
                    />
                    <Text
                      style={[
                        styles.changeText,
                        {
                          color: getChangeIndicator(-stats.expenseChange).color,
                        },
                      ]}
                    >
                      {Math.abs(stats.expenseChange).toFixed(0)}%
                    </Text>
                  </View>
                )}
              </Card>
            </View>

            {/* Savings Card */}
            <Card style={styles.savingsCard}>
              <View style={styles.savingsRow}>
                <View>
                  <Text style={styles.savingsLabel}>Net Savings</Text>
                  <Text
                    style={[
                      styles.savingsValue,
                      {
                        color:
                          stats.savings >= 0 ? colors.income : colors.expense,
                      },
                    ]}
                  >
                    {stats.savings >= 0 ? "+" : ""}
                    {formatCurrency(stats.savings)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.savingsRateBadge,
                    {
                      backgroundColor:
                        stats.savingsRate >= 20
                          ? colors.incomeLight
                          : stats.savingsRate >= 0
                            ? colors.warningLight
                            : colors.expenseLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.savingsRateText,
                      {
                        color:
                          stats.savingsRate >= 20
                            ? colors.income
                            : stats.savingsRate >= 0
                              ? colors.warning
                              : colors.expense,
                      },
                    ]}
                  >
                    {stats.savingsRate.toFixed(0)}% Saved
                  </Text>
                </View>
              </View>
              <View style={styles.savingsBar}>
                <View
                  style={[
                    styles.savingsBarFill,
                    {
                      width: `${Math.min(Math.max(stats.savingsRate, 0), 100)}%`,
                      backgroundColor:
                        stats.savingsRate >= 20
                          ? colors.income
                          : stats.savingsRate >= 0
                            ? colors.warning
                            : colors.expense,
                    },
                  ]}
                />
              </View>
            </Card>

            {/* Quick Stats */}
            <Card style={styles.quickStatsCard}>
              <Text style={styles.cardTitle}>Quick Stats</Text>
              <View style={styles.quickStatsGrid}>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>
                    {filteredTransactions.length}
                  </Text>
                  <Text style={styles.quickStatLabel}>Transactions</Text>
                </View>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>
                    {formatCurrency(spendingPatterns.dailyAvg)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Daily Avg</Text>
                </View>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>
                    {categoryBreakdown.length}
                  </Text>
                  <Text style={styles.quickStatLabel}>Categories</Text>
                </View>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatValue}>{budgets.length}</Text>
                  <Text style={styles.quickStatLabel}>Budgets</Text>
                </View>
              </View>
            </Card>

            {/* Accounts Summary */}
            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Accounts</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {accountsSummary.count}
                  </Text>
                  <Text style={styles.summaryLabel}>Accounts</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(accountsSummary.totalBalance)}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Balance</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {accountsSummary.positiveCount}
                  </Text>
                  <Text style={styles.summaryLabel}>Positive</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {accountsSummary.negativeCount}
                  </Text>
                  <Text style={styles.summaryLabel}>Negative</Text>
                </View>
              </View>
            </Card>

            {/* Goals Summary */}
            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Goals</Text>
              {goalsSummary.totalTarget > 0 ? (
                <>
                  <View style={styles.goalSummaryRow}>
                    <View>
                      <Text style={styles.goalSummaryLabel}>Saved</Text>
                      <Text style={styles.goalSummaryValue}>
                        {formatCurrency(goalsSummary.totalSaved)}
                      </Text>
                    </View>
                    <View style={styles.goalSummaryRight}>
                      <Text style={styles.goalSummaryLabel}>Target</Text>
                      <Text style={styles.goalSummaryValue}>
                        {formatCurrency(goalsSummary.totalTarget)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.goalSummaryBar}>
                    <View
                      style={[
                        styles.goalSummaryBarFill,
                        {
                          width: `${Math.min(goalsSummary.completionRate, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.goalSummaryNote}>
                    {goalsSummary.completedCount} completed •{" "}
                    {goalsSummary.activeCount} active
                  </Text>
                </>
              ) : (
                <Text style={styles.emptyInlineText}>No goals set yet</Text>
              )}
            </Card>

            {/* Budgets & Subscriptions */}
            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Budgets & Subscriptions</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(budgetsSummary.budgetForPeriod)}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    Budgeted ({getPeriodLabel()})
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(budgetsSummary.spentInPeriod)}
                  </Text>
                  <Text style={styles.summaryLabel}>Spent</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(subscriptionsSummary.periodTotal)}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    Subs ({getPeriodLabel()})
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {subscriptionsSummary.activeCount}
                  </Text>
                  <Text style={styles.summaryLabel}>Active Subs</Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* SPENDING TAB */}
        {activeTab === "spending" && (
          <>
            {/* Category Breakdown */}
            <Card style={styles.breakdownCard}>
              <Text style={styles.cardTitle}>Expense Breakdown</Text>
              {categoryBreakdown.length > 0 ? (
                <>
                  {/* Visual Bar Chart */}
                  <View style={styles.pieContainer}>
                    {categoryBreakdown.slice(0, 5).map((cat) => (
                      <View
                        key={cat.id}
                        style={[
                          styles.pieSegment,
                          {
                            backgroundColor: cat.color,
                            width: `${Math.max(cat.percentage, 5)}%`,
                          },
                        ]}
                      />
                    ))}
                  </View>

                  {categoryBreakdown.map((cat) => (
                    <View key={cat.id} style={styles.breakdownItem}>
                      <View style={styles.breakdownLeft}>
                        <View
                          style={[
                            styles.breakdownDot,
                            { backgroundColor: cat.color },
                          ]}
                        />
                        <View>
                          <Text style={styles.breakdownName}>{cat.name}</Text>
                          <Text style={styles.breakdownCount}>
                            {cat.count} transactions • Avg:{" "}
                            {formatCurrency(cat.avgTransaction)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.breakdownRight}>
                        <Text style={styles.breakdownAmount}>
                          {formatCurrency(cat.amount)}
                        </Text>
                        <View style={styles.breakdownMeta}>
                          <Text style={styles.breakdownPercentage}>
                            {cat.percentage.toFixed(1)}%
                          </Text>
                          {cat.change !== 0 && (
                            <View
                              style={[
                                styles.changeChip,
                                {
                                  backgroundColor:
                                    cat.change > 0
                                      ? colors.expenseLight
                                      : colors.incomeLight,
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  cat.change > 0 ? "arrow-up" : "arrow-down"
                                }
                                size={10}
                                color={
                                  cat.change > 0
                                    ? colors.expense
                                    : colors.income
                                }
                              />
                              <Text
                                style={[
                                  styles.changeChipText,
                                  {
                                    color:
                                      cat.change > 0
                                        ? colors.expense
                                        : colors.income,
                                  },
                                ]}
                              >
                                {Math.abs(cat.change).toFixed(0)}%
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="pie-chart-outline"
                    size={48}
                    color={colors.textMuted}
                  />
                  <Text style={styles.emptyText}>No expenses this period</Text>
                </View>
              )}
            </Card>

            {/* Budget Usage */}
            <Card style={styles.budgetUsageCard}>
              <Text style={styles.cardTitle}>Budget Usage</Text>
              {budgetsSummary.budgetForPeriod > 0 ? (
                <>
                  <View style={styles.budgetUsageHeader}>
                    <Text style={styles.budgetUsageLabel}>
                      {formatCurrency(budgetsSummary.spentInPeriod)} spent of{" "}
                      {formatCurrency(budgetsSummary.budgetForPeriod)}
                    </Text>
                    <Text style={styles.budgetUsagePercent}>
                      {budgetsSummary.utilization.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.budgetUsageBar}>
                    <View
                      style={[
                        styles.budgetUsageBarFill,
                        {
                          width: `${Math.min(budgetsSummary.utilization, 100)}%`,
                          backgroundColor:
                            budgetsSummary.utilization > 100
                              ? colors.expense
                              : budgetsSummary.utilization > 85
                                ? colors.warning
                                : colors.income,
                        },
                      ]}
                    />
                  </View>
                  {budgetsSummary.budgetUsage.slice(0, 3).map((budget) => (
                    <View key={budget.id} style={styles.budgetUsageItem}>
                      <View style={styles.budgetUsageLeft}>
                        <View
                          style={[
                            styles.budgetUsageDot,
                            { backgroundColor: budget.color },
                          ]}
                        />
                        <Text style={styles.budgetUsageName}>
                          {budget.name}
                        </Text>
                      </View>
                      <Text style={styles.budgetUsageValue}>
                        {formatCurrency(budget.spent)} /{" "}
                        {formatCurrency(budget.limit)}
                      </Text>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="wallet-outline"
                    size={48}
                    color={colors.textMuted}
                  />
                  <Text style={styles.emptyText}>No budgets set</Text>
                </View>
              )}
            </Card>

            {/* Day of Week Analysis */}
            <Card style={styles.dayAnalysisCard}>
              <Text style={styles.cardTitle}>Spending by Day</Text>
              <View style={styles.dayChart}>
                {spendingPatterns.dayNames.map((day, index) => {
                  const maxDay = Math.max(...spendingPatterns.byDayOfWeek);
                  const height =
                    maxDay > 0
                      ? (spendingPatterns.byDayOfWeek[index] / maxDay) * 100
                      : 0;
                  const isHighest =
                    spendingPatterns.byDayOfWeek[index] === maxDay &&
                    maxDay > 0;

                  return (
                    <View key={day} style={styles.dayBarContainer}>
                      <View style={styles.dayBarWrapper}>
                        <View
                          style={[
                            styles.dayBar,
                            { height: `${Math.max(height, 5)}%` },
                            isHighest && styles.dayBarHighest,
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.dayLabel,
                          isHighest && styles.dayLabelHighest,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.dayInsight}>
                <Ionicons
                  name="information-circle"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.dayInsightText}>
                  You spend most on {spendingPatterns.highestSpendingDay}s
                </Text>
              </View>
            </Card>

            {/* Top Categories Card */}
            <Card style={styles.topCategoriesCard}>
              <Text style={styles.cardTitle}>Top 3 Expenses</Text>
              {spendingPatterns.topCategories.map((cat, index) => (
                <View key={cat.id} style={styles.topCategoryItem}>
                  <View
                    style={[
                      styles.topCategoryRank,
                      {
                        backgroundColor:
                          index === 0
                            ? "#FFD700"
                            : index === 1
                              ? "#C0C0C0"
                              : "#CD7F32",
                      },
                    ]}
                  >
                    <Text style={styles.topCategoryRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.topCategoryInfo}>
                    <Text style={styles.topCategoryName}>{cat.name}</Text>
                    <View style={styles.topCategoryBar}>
                      <View
                        style={[
                          styles.topCategoryBarFill,
                          {
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.topCategoryAmount}>
                    {formatCurrency(cat.amount)}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* TRENDS TAB */}
        {activeTab === "trends" && (
          <>
            {/* Trend Chart */}
            <Card style={styles.chartCard}>
              <Text style={styles.cardTitle}>
                {selectedPeriod === "year" ? "Monthly" : "Daily"} Trend
              </Text>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.income },
                    ]}
                  />
                  <Text style={styles.legendText}>Income</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.expense },
                    ]}
                  />
                  <Text style={styles.legendText}>Expenses</Text>
                </View>
              </View>
              <View style={styles.chart}>
                {dailyTrend
                  .slice(selectedPeriod === "year" ? 0 : -7)
                  .map((day, index) => (
                    <View key={index} style={styles.chartBar}>
                      <View style={styles.chartBarContainer}>
                        <View
                          style={[
                            styles.chartBarFill,
                            styles.chartBarIncome,
                            {
                              height: `${(day.income / maxTrendValue) * 100}%`,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.chartBarFill,
                            styles.chartBarExpense,
                            {
                              height: `${(day.expense / maxTrendValue) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartLabel}>{day.label}</Text>
                    </View>
                  ))}
              </View>
            </Card>

            {/* Cumulative Net Trend */}
            <Card style={styles.netTrendCard}>
              <Text style={styles.cardTitle}>Net Flow</Text>
              <Text style={styles.netTrendSubtitle}>
                Running balance of income minus expenses
              </Text>
              <View style={styles.netTrendChart}>
                {(() => {
                  let cumulative = 0;
                  const data = dailyTrend
                    .slice(selectedPeriod === "year" ? 0 : -7)
                    .map((d) => {
                      cumulative += d.net;
                      return { ...d, cumulative };
                    });
                  const maxAbs = Math.max(
                    ...data.map((d) => Math.abs(d.cumulative)),
                    1,
                  );

                  return data.map((day, index) => {
                    const height = (Math.abs(day.cumulative) / maxAbs) * 50;
                    const isPositive = day.cumulative >= 0;

                    return (
                      <View key={index} style={styles.netTrendBarContainer}>
                        <View
                          style={[
                            styles.netTrendBarTop,
                            { height: isPositive ? height : 0 },
                          ]}
                        >
                          {isPositive && (
                            <View
                              style={[
                                styles.netTrendBar,
                                { backgroundColor: colors.income },
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.netTrendLine} />
                        <View
                          style={[
                            styles.netTrendBarBottom,
                            { height: !isPositive ? height : 0 },
                          ]}
                        >
                          {!isPositive && (
                            <View
                              style={[
                                styles.netTrendBar,
                                { backgroundColor: colors.expense },
                              ]}
                            />
                          )}
                        </View>
                        <Text style={styles.netTrendLabel}>{day.label}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </Card>

            {/* Period Comparison */}
            <Card style={styles.comparisonCard}>
              <Text style={styles.cardTitle}>Period Comparison</Text>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>This Period</Text>
                  <Text style={styles.comparisonValue}>
                    {formatCurrency(stats.expenses)}
                  </Text>
                </View>
                <View style={styles.comparisonVs}>
                  <Text style={styles.comparisonVsText}>vs</Text>
                </View>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Last Period</Text>
                  <Text style={styles.comparisonValue}>
                    {formatCurrency(stats.prevExpenses)}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.comparisonResult,
                  {
                    backgroundColor:
                      stats.expenseChange <= 0
                        ? colors.incomeLight
                        : colors.expenseLight,
                  },
                ]}
              >
                <Ionicons
                  name={
                    stats.expenseChange <= 0 ? "trending-down" : "trending-up"
                  }
                  size={20}
                  color={
                    stats.expenseChange <= 0 ? colors.income : colors.expense
                  }
                />
                <Text
                  style={[
                    styles.comparisonResultText,
                    {
                      color:
                        stats.expenseChange <= 0
                          ? colors.income
                          : colors.expense,
                    },
                  ]}
                >
                  {stats.expenseChange <= 0 ? "You spent " : "You spent "}
                  {formatCurrency(
                    Math.abs(stats.expenses - stats.prevExpenses),
                  )}
                  {stats.expenseChange <= 0 ? " less" : " more"} than last
                  period
                </Text>
              </View>
            </Card>
          </>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === "insights" && (
          <>
            {/* AI Insights */}
            <View style={styles.insightsHeader}>
              <Ionicons name="sparkles" size={24} color={colors.primary} />
              <Text style={styles.insightsTitle}>Smart Insights</Text>
            </View>

            {insights.length > 0 ? (
              insights.map((insight, index) => (
                <Card
                  key={index}
                  style={[
                    styles.insightCard,
                    {
                      borderLeftColor:
                        insight.type === "success"
                          ? colors.income
                          : insight.type === "warning"
                            ? colors.warning
                            : insight.type === "tip"
                              ? colors.accent
                              : colors.primary,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.insightIconContainer,
                      {
                        backgroundColor:
                          insight.type === "success"
                            ? colors.incomeLight
                            : insight.type === "warning"
                              ? colors.warningLight
                              : insight.type === "tip"
                                ? colors.accentLight
                                : colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={insight.icon}
                      size={20}
                      color={
                        insight.type === "success"
                          ? colors.income
                          : insight.type === "warning"
                            ? colors.warning
                            : insight.type === "tip"
                              ? colors.accent
                              : colors.primary
                      }
                    />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightMessage}>{insight.message}</Text>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.noInsightsCard}>
                <Ionicons
                  name="analytics-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={styles.noInsightsText}>
                  Add more transactions to get personalized insights
                </Text>
              </Card>
            )}

            {/* Financial Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
              <Card style={styles.tipCard}>
                <Text style={styles.tipText}>
                  Track every expense, no matter how small. Small purchases add
                  up quickly!
                </Text>
              </Card>
              <Card style={styles.tipCard}>
                <Text style={styles.tipText}>
                  Set up budgets for your top spending categories to stay on
                  track.
                </Text>
              </Card>
              <Card style={styles.tipCard}>
                <Text style={styles.tipText}>
                  Review your subscriptions monthly. Cancel ones you don't use.
                </Text>
              </Card>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1A1A2E",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFD700",
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.md,
  },
  periodButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  tabButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Health Score Card
  healthScoreCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  healthScoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  healthScoreTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  healthScoreBadge: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  healthScoreValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFF",
  },
  healthScoreMax: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  healthScoreBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  healthScoreBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  healthScoreLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },

  // Overview Grid
  overviewGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  overviewCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  incomeCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.income,
  },
  expenseCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.expense,
  },
  overviewIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  overviewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  changeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Savings Card
  savingsCard: {
    marginBottom: spacing.md,
  },
  savingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  savingsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  savingsValue: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
  savingsRateBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  savingsRateText: {
    fontSize: 13,
    fontWeight: "600",
  },
  savingsBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  savingsBarFill: {
    height: "100%",
    borderRadius: 4,
  },

  // Quick Stats
  quickStatsCard: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  quickStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  quickStatItem: {
    width: "50%",
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Summary Cards
  summaryCard: {
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryItem: {
    width: "50%",
    paddingVertical: spacing.sm,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyInlineText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  goalSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  goalSummaryRight: {
    alignItems: "flex-end",
  },
  goalSummaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  goalSummaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 2,
  },
  goalSummaryBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  goalSummaryBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  goalSummaryNote: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Budget Usage
  budgetUsageCard: {
    marginBottom: spacing.md,
  },
  budgetUsageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  budgetUsageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  budgetUsagePercent: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  budgetUsageBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  budgetUsageBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  budgetUsageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  budgetUsageLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  budgetUsageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  budgetUsageName: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  budgetUsageValue: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Breakdown Card
  breakdownCard: {
    marginBottom: spacing.md,
  },
  pieContainer: {
    flexDirection: "row",
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  pieSegment: {
    height: "100%",
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  breakdownCount: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  breakdownRight: {
    alignItems: "flex-end",
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  breakdownMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },
  breakdownPercentage: {
    fontSize: 12,
    color: colors.textMuted,
  },
  changeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  changeChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // Day Analysis Card
  dayAnalysisCard: {
    marginBottom: spacing.md,
  },
  dayChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 100,
    marginBottom: spacing.md,
  },
  dayBarContainer: {
    flex: 1,
    alignItems: "center",
  },
  dayBarWrapper: {
    flex: 1,
    width: "60%",
    justifyContent: "flex-end",
  },
  dayBar: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  dayBarHighest: {
    backgroundColor: colors.expense,
  },
  dayLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  dayLabelHighest: {
    color: colors.expense,
    fontWeight: "600",
  },
  dayInsight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  dayInsightText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Top Categories Card
  topCategoriesCard: {
    marginBottom: spacing.md,
  },
  topCategoryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  topCategoryRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  topCategoryRankText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
  },
  topCategoryInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  topCategoryName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  topCategoryBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  topCategoryBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  topCategoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  // Chart Card
  chartCard: {
    marginBottom: spacing.md,
  },
  chartLegend: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chart: {
    flexDirection: "row",
    height: 120,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
  },
  chartBarContainer: {
    width: "60%",
    height: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
  },
  chartBarFill: {
    width: 8,
    minHeight: 2,
    borderRadius: 4,
  },
  chartBarIncome: {
    backgroundColor: colors.income,
  },
  chartBarExpense: {
    backgroundColor: colors.expense,
  },
  chartLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Net Trend Card
  netTrendCard: {
    marginBottom: spacing.md,
  },
  netTrendSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  netTrendChart: {
    flexDirection: "row",
    height: 100,
    justifyContent: "space-between",
  },
  netTrendBarContainer: {
    flex: 1,
    alignItems: "center",
  },
  netTrendBarTop: {
    width: "60%",
    justifyContent: "flex-end",
  },
  netTrendLine: {
    width: "80%",
    height: 1,
    backgroundColor: colors.border,
  },
  netTrendBarBottom: {
    width: "60%",
    justifyContent: "flex-start",
  },
  netTrendBar: {
    width: "100%",
    height: "100%",
    borderRadius: 2,
    minHeight: 2,
  },
  netTrendLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Comparison Card
  comparisonCard: {
    marginBottom: spacing.md,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  comparisonItem: {
    flex: 1,
    alignItems: "center",
  },
  comparisonLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  comparisonVs: {
    paddingHorizontal: spacing.md,
  },
  comparisonVsText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  comparisonResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  comparisonResultText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },

  // Insights
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  noInsightsCard: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  noInsightsText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: "center",
  },
  tipsSection: {
    marginTop: spacing.lg,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tipCard: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  tipText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
