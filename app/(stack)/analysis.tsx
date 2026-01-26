import { useState, useMemo, useCallback } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Modal,
  Pressable,
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
import { useCurrency } from "../../lib/contexts/CurrencyContext";
import {
  spacing,
  borderRadius,
  formatCurrency,
  categoryConfig,
} from "../../lib/theme";
import { useThemeColors, ThemeColors } from "../../lib/theme";
import { Card, LoadingState } from "../../lib/components";

// Format currency with abbreviations for compact display
const formatCompactCurrency = (
  amount: number,
  currencySymbol: string = "$",
): string => {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absAmount >= 1000000) {
    return `${sign}${currencySymbol}${(absAmount / 1000000).toFixed(1)}M`;
  } else if (absAmount >= 1000) {
    return `${sign}${currencySymbol}${(absAmount / 1000).toFixed(1)}K`;
  } else {
    return `${sign}${currencySymbol}${absAmount.toFixed(0)}`;
  }
};
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
  ContributionGraph,
} from "react-native-chart-kit";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { matchMerchant } from "../../lib/smartCategories";

const { width } = Dimensions.get("window");

type Period = "week" | "month" | "quarter" | "year" | "custom";
type AnalyticsTab =
  | "overview"
  | "spending"
  | "income"
  | "cashflow"
  | "budgets"
  | "subscriptions"
  | "goals"
  | "insights";
type CompareMode = "previous" | "year";
type TypeFilter = "all" | "income" | "expense";

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, activeTheme } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { defaultCurrency } = useCurrency();
  const currencySymbol = defaultCurrency?.symbol || "$";
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
  const [compareMode, setCompareMode] = useState<CompareMode>("previous");
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customRange, setCustomRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: end.getTime() };
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

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

    if (selectedPeriod === "custom") {
      return {
        start: Math.min(customRange.start, customRange.end),
        end: Math.max(customRange.start, customRange.end),
      };
    }

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
  }, [selectedPeriod, customRange]);

  const previousPeriodRange = useMemo(() => {
    if (compareMode === "year") {
      const startDate = new Date(periodRange.start);
      const endDate = new Date(periodRange.end);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate.setFullYear(endDate.getFullYear() - 1);
      return { start: startDate.getTime(), end: endDate.getTime() };
    }

    const duration = periodRange.end - periodRange.start;
    const end = periodRange.start;
    const start = end - duration;

    return { start, end };
  }, [periodRange, compareMode]);

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const inRange = t.date >= periodRange.start && t.date <= periodRange.end;
      if (!inRange) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (selectedAccountId && t.accountId !== selectedAccountId) return false;
      if (selectedCategoryId && t.categoryId !== selectedCategoryId)
        return false;
      return true;
    });
  }, [
    transactions,
    periodRange,
    typeFilter,
    selectedAccountId,
    selectedCategoryId,
  ]);

  // Previous period transactions for comparison
  const previousPeriodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const inRange =
        t.date >= previousPeriodRange.start && t.date < previousPeriodRange.end;
      if (!inRange) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (selectedAccountId && t.accountId !== selectedAccountId) return false;
      if (selectedCategoryId && t.categoryId !== selectedCategoryId)
        return false;
      return true;
    });
  }, [
    transactions,
    previousPeriodRange,
    typeFilter,
    selectedAccountId,
    selectedCategoryId,
  ]);

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
      case "custom":
        return (
          (periodRange.end - periodRange.start) / (1000 * 60 * 60 * 24 * 30.44)
        );
    }
  }, [selectedPeriod, periodRange]);

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

  const incomeBreakdown = useMemo(() => {
    const incomeByCategory = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce(
        (acc, t) => {
          const cat = categories.find((c) => c.id === t.categoryId);
          const catName = cat?.name || "Income";
          const catColor = cat?.color || colors.income;

          if (!acc[t.categoryId]) {
            acc[t.categoryId] = {
              id: t.categoryId,
              name: catName,
              amount: 0,
              color: catColor,
              count: 0,
            };
          }
          acc[t.categoryId].amount += t.amount;
          acc[t.categoryId].count += 1;
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
          }
        >,
      );

    return Object.values(incomeByCategory)
      .map((item) => ({
        ...item,
        percentage: stats.income > 0 ? (item.amount / stats.income) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categories, stats.income, colors.income]);

  const merchantBreakdown = useMemo(() => {
    const expenseTx = filteredTransactions.filter((t) => t.type === "expense");
    const byMerchant = expenseTx.reduce(
      (acc, t) => {
        const normalized = matchMerchant(t.description) || t.description;
        const merchant = normalized.trim() || "Unknown";
        if (!acc[merchant]) {
          acc[merchant] = { name: merchant, amount: 0, count: 0 };
        }
        acc[merchant].amount += t.amount;
        acc[merchant].count += 1;
        return acc;
      },
      {} as Record<string, { name: string; amount: number; count: number }>,
    );

    return Object.values(byMerchant)
      .map((item) => ({
        ...item,
        avg: item.count > 0 ? item.amount / item.count : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredTransactions]);

  const transactionSizeBuckets = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    const labels = ["<$10", "$10–$50", "$50–$200", "$200–$500", "$500+"];
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        if (t.amount < 10) buckets[0] += 1;
        else if (t.amount < 50) buckets[1] += 1;
        else if (t.amount < 200) buckets[2] += 1;
        else if (t.amount < 500) buckets[3] += 1;
        else buckets[4] += 1;
      });
    return labels.map((label, index) => ({ label, count: buckets[index] }));
  }, [filteredTransactions]);

  const cashFlowSummary = useMemo(() => {
    const net = stats.income - stats.expenses;
    const coverage = stats.expenses > 0 ? stats.income / stats.expenses : 0;
    const liquidityRatio =
      stats.expenses > 0 ? accountsSummary.totalBalance / stats.expenses : 0;
    return { net, coverage, liquidityRatio };
  }, [stats, accountsSummary.totalBalance]);

  const subscriptionAnalytics = useMemo(() => {
    const active = subscriptions.filter((s) => s.isActive);
    const annualTotal = active.reduce((sum, s) => {
      const multiplier =
        s.frequency === "daily"
          ? 365
          : s.frequency === "weekly"
            ? 52
            : s.frequency === "monthly"
              ? 12
              : 1;
      return sum + s.amount * multiplier;
    }, 0);

    const upcoming = active
      .filter(
        (s) =>
          s.nextDueDate >= periodRange.start &&
          s.nextDueDate <= periodRange.end,
      )
      .sort((a, b) => a.nextDueDate - b.nextDueDate)
      .slice(0, 5);

    return { active, annualTotal, upcoming };
  }, [subscriptions, periodRange]);

  const goalProjection = useMemo(() => {
    const monthlySavings = stats.savings / Math.max(periodMonths, 1);
    const nextGoal = goalsSummary.nextGoal;
    if (!nextGoal || monthlySavings <= 0) {
      return { monthlySavings, monthsToGoal: null };
    }
    const remaining = Math.max(
      nextGoal.targetAmount - nextGoal.currentAmount,
      0,
    );
    const monthsToGoal = remaining / monthlySavings;
    return { monthlySavings, monthsToGoal };
  }, [stats.savings, periodMonths, goalsSummary.nextGoal]);

  // Daily spending trend
  const dailyTrend = useMemo(() => {
    const daysInRange = Math.max(
      1,
      Math.ceil((periodRange.end - periodRange.start) / (1000 * 60 * 60 * 24)),
    );
    const days =
      selectedPeriod === "week"
        ? 7
        : selectedPeriod === "month"
          ? 30
          : selectedPeriod === "quarter"
            ? 90
            : selectedPeriod === "year"
              ? 12
              : daysInRange;
    const rangeEnd =
      selectedPeriod === "custom" ? new Date(periodRange.end) : new Date();
    const trend: {
      label: string;
      fullDate: string;
      income: number;
      expense: number;
      net: number;
    }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(rangeEnd);

      if (selectedPeriod === "year") {
        date.setMonth(rangeEnd.getMonth() - i);
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
        date.setDate(rangeEnd.getDate() - i);
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
  }, [transactions, selectedPeriod, periodRange]);

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
            : selectedPeriod === "year"
              ? 365
              : Math.max(
                  1,
                  Math.ceil(
                    (periodRange.end - periodRange.start) /
                      (1000 * 60 * 60 * 24),
                  ),
                );
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
  }, [
    filteredTransactions,
    stats,
    categoryBreakdown,
    selectedPeriod,
    periodRange,
  ]);

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

    // Top merchant insight
    if (merchantBreakdown.length > 0) {
      const topMerchant = merchantBreakdown[0];
      result.push({
        type: "info",
        title: "Top Merchant",
        message: `Your highest spending merchant is ${topMerchant.name} at ${formatCurrency(topMerchant.amount)} this period.`,
        icon: "storefront",
      });
    }

    // Cash flow coverage
    if (cashFlowSummary.coverage > 0) {
      result.push({
        type: cashFlowSummary.coverage >= 1.2 ? "success" : "warning",
        title: "Income Coverage",
        message: `Your income covers ${cashFlowSummary.coverage.toFixed(2)}× of your expenses this period.`,
        icon: "swap-vertical",
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
    merchantBreakdown,
    cashFlowSummary,
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

  const formatShortDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

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
      case "custom":
        return `${formatShortDate(periodRange.start)} – ${formatShortDate(periodRange.end)}`;
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
        {(["week", "month", "quarter", "year", "custom"] as Period[]).map(
          (period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => {
                hapticFeedback();
                setSelectedPeriod(period);
                if (period === "custom") {
                  setShowRangeModal(true);
                }
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
                      : period === "year"
                        ? "Y"
                        : "C"}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      {/* Range + Filters */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={styles.controlChip}
          onPress={() => {
            hapticFeedback();
            setShowRangeModal(true);
          }}
        >
          <Ionicons name="calendar" size={16} color={colors.textSecondary} />
          <Text style={styles.controlChipText}>{getPeriodLabel()}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlChip}
          onPress={() => {
            hapticFeedback();
            setCompareMode(compareMode === "previous" ? "year" : "previous");
          }}
        >
          <Ionicons
            name="swap-horizontal"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.controlChipText}>
            {compareMode === "previous" ? "vs Prev" : "vs Last Year"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlChip}
          onPress={() => {
            hapticFeedback();
            setShowFilterModal(true);
          }}
        >
          <Ionicons name="options" size={16} color={colors.textSecondary} />
          <Text style={styles.controlChipText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.tabBar]}
        style={{
          maxHeight: 60,
        }}
      >
        {(
          [
            { id: "overview", label: "Overview", icon: "grid" },
            { id: "spending", label: "Spending", icon: "pie-chart" },
            { id: "income", label: "Income", icon: "cash" },
            { id: "cashflow", label: "Cash Flow", icon: "swap-vertical" },
            { id: "budgets", label: "Budgets", icon: "wallet" },
            { id: "subscriptions", label: "Subs", icon: "repeat" },
            { id: "goals", label: "Goals", icon: "flag" },
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
      </ScrollView>

      <Modal
        visible={showRangeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRangeModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowRangeModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Custom Range</Text>
                <Text style={styles.modalSubtitle}>
                  Select start and end dates
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowRangeModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {Platform.OS === "web" ? (
                <View style={styles.webDateControls}>
                  <View style={styles.webDateRow}>
                    <Text style={styles.webDateLabel}>Start</Text>
                    <View style={styles.webDateButtons}>
                      <TouchableOpacity
                        style={styles.webDateButton}
                        onPress={() =>
                          setCustomRange((prev) => ({
                            ...prev,
                            start: prev.start - 24 * 60 * 60 * 1000,
                          }))
                        }
                      >
                        <Text style={styles.webDateButtonText}>-1d</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.webDateButton}
                        onPress={() =>
                          setCustomRange((prev) => ({
                            ...prev,
                            start: prev.start + 24 * 60 * 60 * 1000,
                          }))
                        }
                      >
                        <Text style={styles.webDateButtonText}>+1d</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.webDateValue}>
                      {formatShortDate(customRange.start)}
                    </Text>
                  </View>
                  <View style={styles.webDateRow}>
                    <Text style={styles.webDateLabel}>End</Text>
                    <View style={styles.webDateButtons}>
                      <TouchableOpacity
                        style={styles.webDateButton}
                        onPress={() =>
                          setCustomRange((prev) => ({
                            ...prev,
                            end: prev.end - 24 * 60 * 60 * 1000,
                          }))
                        }
                      >
                        <Text style={styles.webDateButtonText}>-1d</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.webDateButton}
                        onPress={() =>
                          setCustomRange((prev) => ({
                            ...prev,
                            end: prev.end + 24 * 60 * 60 * 1000,
                          }))
                        }
                      >
                        <Text style={styles.webDateButtonText}>+1d</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.webDateValue}>
                      {formatShortDate(customRange.end)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerLabel}>Start</Text>
                  <DateTimePicker
                    value={new Date(customRange.start)}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    themeVariant={activeTheme}
                    onChange={(_, date) => {
                      if (date) {
                        setCustomRange((prev) => ({
                          ...prev,
                          start: date.getTime(),
                        }));
                      }
                    }}
                  />
                  <Text style={styles.datePickerLabel}>End</Text>
                  <DateTimePicker
                    value={new Date(customRange.end)}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    themeVariant={activeTheme}
                    onChange={(_, date) => {
                      if (date) {
                        setCustomRange((prev) => ({
                          ...prev,
                          end: date.getTime(),
                        }));
                      }
                    }}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setCustomRange(() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 30);
                    start.setHours(0, 0, 0, 0);
                    return { start: start.getTime(), end: end.getTime() };
                  });
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Reset</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  setSelectedPeriod("custom");
                  setShowRangeModal(false);
                }}
              >
                <Text style={styles.modalButtonTextPrimary}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filters</Text>
                <Text style={styles.modalSubtitle}>Refine analytics</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Type</Text>
            <View style={styles.filterRow}>
              {(["all", "income", "expense"] as TypeFilter[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    typeFilter === type && styles.filterChipActive,
                  ]}
                  onPress={() => setTypeFilter(type)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      typeFilter === type && styles.filterChipTextActive,
                    ]}
                  >
                    {type === "all" ? "All" : type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Accounts</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !selectedAccountId && styles.filterChipActive,
                ]}
                onPress={() => setSelectedAccountId(null)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    !selectedAccountId && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.filterChip,
                    selectedAccountId === account.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedAccountId(account.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedAccountId === account.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.filterSectionTitle}>Categories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !selectedCategoryId && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategoryId(null)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    !selectedCategoryId && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.filterChip,
                    selectedCategoryId === category.id &&
                      styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedCategoryId(category.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategoryId === category.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setTypeFilter("all");
                  setSelectedAccountId(null);
                  setSelectedCategoryId(null);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Reset</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalButtonTextPrimary}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressViewOffset={0}
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

            {/* Overview Charts */}
            <Card style={styles.chartCard}>
              <Text style={styles.cardTitle}>Cash Flow Trend</Text>
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

            <Card style={styles.breakdownCard}>
              <Text style={styles.cardTitle}>Spending Breakdown</Text>
              {categoryBreakdown.length > 0 ? (
                <>
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
                  {categoryBreakdown.slice(0, 3).map((cat) => (
                    <View key={cat.id} style={styles.breakdownItem}>
                      <View style={styles.breakdownLeft}>
                        <View
                          style={[
                            styles.breakdownDot,
                            { backgroundColor: cat.color },
                          ]}
                        />
                        <Text style={styles.breakdownName}>{cat.name}</Text>
                      </View>
                      <View style={styles.breakdownRight}>
                        <Text style={styles.breakdownAmount}>
                          {formatCurrency(cat.amount)}
                        </Text>
                        <Text style={styles.breakdownPercentage}>
                          {cat.percentage.toFixed(1)}%
                        </Text>
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

            <Card style={styles.budgetUsageCard}>
              <Text style={styles.cardTitle}>Budget Utilization</Text>
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
                <Text style={styles.emptyInlineText}>No budgets set yet</Text>
              )}
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Top Merchants</Text>
              {merchantBreakdown.length > 0 ? (
                merchantBreakdown.slice(0, 3).map((merchant) => (
                  <View key={merchant.name} style={styles.listRow}>
                    <View>
                      <Text style={styles.listTitle}>{merchant.name}</Text>
                      <Text style={styles.listSubtitle}>
                        {merchant.count} tx • Avg {formatCurrency(merchant.avg)}
                      </Text>
                    </View>
                    <Text style={styles.listValue}>
                      {formatCurrency(merchant.amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyInlineText}>No merchants yet</Text>
              )}
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Upcoming Bills</Text>
              {subscriptionAnalytics.upcoming.length > 0 ? (
                subscriptionAnalytics.upcoming.slice(0, 3).map((sub) => (
                  <View key={sub.id} style={styles.listRow}>
                    <View>
                      <Text style={styles.listTitle}>{sub.name}</Text>
                      <Text style={styles.listSubtitle}>
                        Due {formatShortDate(sub.nextDueDate)}
                      </Text>
                    </View>
                    <Text style={styles.listValue}>
                      {formatCurrency(sub.amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyInlineText}>No upcoming bills</Text>
              )}
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

            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Top Merchants</Text>
              {merchantBreakdown.length > 0 ? (
                merchantBreakdown.map((merchant) => (
                  <View key={merchant.name} style={styles.listRow}>
                    <View style={styles.listLeftContent}>
                      <Text
                        style={styles.listTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {merchant.name}
                      </Text>
                      <Text style={styles.listSubtitle}>
                        {merchant.count} tx • Avg {formatCurrency(merchant.avg)}
                      </Text>
                    </View>
                    <Text style={styles.listValue}>
                      {formatCurrency(merchant.amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyInlineText}>No merchants yet</Text>
              )}
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Transaction Size</Text>
              <View style={styles.summaryGrid}>
                {transactionSizeBuckets.map((bucket, index) => {
                  const iconNames = [
                    "cart-outline",
                    "restaurant-outline",
                    "home-outline",
                    "diamond-outline",
                  ];
                  const bgColors = [
                    colors.primaryLight,
                    colors.incomeLight,
                    colors.warningLight,
                    colors.expenseLight,
                  ];
                  const iconColors = [
                    colors.primary,
                    colors.income,
                    colors.warning,
                    colors.expense,
                  ];
                  return (
                    <View key={bucket.label} style={styles.summaryItem}>
                      <View
                        style={[
                          styles.summaryItemIcon,
                          {
                            backgroundColor: bgColors[index % bgColors.length],
                          },
                        ]}
                      >
                        <Ionicons
                          name={iconNames[index % iconNames.length] as any}
                          size={20}
                          color={iconColors[index % iconColors.length]}
                        />
                      </View>
                      <View style={styles.summaryItemContent}>
                        <Text style={styles.summaryValue}>{bucket.count}</Text>
                        <Text style={styles.summaryLabel}>{bucket.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          </>
        )}

        {/* INCOME TAB */}
        {activeTab === "income" && (
          <>
            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Income Overview</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.incomeLight },
                    ]}
                  >
                    <Ionicons name="cash" size={20} color={colors.income} />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {formatCompactCurrency(stats.income, currencySymbol)}
                    </Text>
                    <Text style={styles.summaryLabel}>Total Income</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name="calendar"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {formatCompactCurrency(
                        stats.income / Math.max(periodMonths, 1),
                        currencySymbol,
                      )}
                    </Text>
                    <Text style={styles.summaryLabel}>Monthly Avg</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.warningLight },
                    ]}
                  >
                    <Ionicons name="star" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {formatCompactCurrency(
                        incomeBreakdown[0]?.amount || 0,
                        currencySymbol,
                      )}
                    </Text>
                    <Text style={styles.summaryLabel}>Top Source</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.accentLight },
                    ]}
                  >
                    <Ionicons name="layers" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {incomeBreakdown.length}
                    </Text>
                    <Text style={styles.summaryLabel}>Sources</Text>
                  </View>
                </View>
              </View>
            </Card>

            {incomeBreakdown.length > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.cardTitle}>
                    Income Sources Distribution
                  </Text>
                  <Text style={styles.chartSubtitle}>
                    Top 5 of {incomeBreakdown.length} sources
                  </Text>
                </View>
                <PieChart
                  data={incomeBreakdown.slice(0, 5).map((source, index) => {
                    const pieColors = [
                      "#22c55e",
                      "#10b981",
                      "#34d399",
                      "#6ee7b7",
                      "#a7f3d0",
                    ];
                    return {
                      name: source.name.substring(0, 12),
                      population: Math.round(source.amount),
                      color: pieColors[index % pieColors.length],
                      legendFontColor: colors.textSecondary,
                      legendFontSize: 12,
                    };
                  })}
                  width={width - spacing.lg * 4}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => colors.income,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  style={{
                    marginVertical: 8,
                    borderRadius: borderRadius.md,
                  }}
                />
              </Card>
            )}

            {incomeBreakdown.length > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.cardTitle}>Income Trend</Text>
                  <Text style={styles.chartSubtitle}>
                    {selectedPeriod === "year" ? "Monthly" : "Last 7 days"}{" "}
                    income pattern
                  </Text>
                </View>
                <LineChart
                  data={{
                    labels: dailyTrend
                      .slice(selectedPeriod === "year" ? 0 : -7)
                      .map((d) => d.label),
                    datasets: [
                      {
                        data: dailyTrend
                          .slice(selectedPeriod === "year" ? 0 : -7)
                          .map((d) => Math.max(d.income, 1)),
                      },
                    ],
                  }}
                  width={width - spacing.lg * 4}
                  height={220}
                  chartConfig={{
                    backgroundColor: colors.surface,
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => colors.income,
                    labelColor: () => colors.textSecondary,
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: colors.income,
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: borderRadius.md,
                  }}
                  fromZero
                />
              </Card>
            )}

            <Card style={styles.breakdownCard}>
              <Text style={styles.cardTitle}>Detailed Breakdown</Text>
              {incomeBreakdown.length > 0 ? (
                <>
                  {incomeBreakdown.map((source) => (
                    <View key={source.id} style={styles.breakdownItem}>
                      <View style={styles.breakdownLeft}>
                        <View
                          style={[
                            styles.breakdownDot,
                            { backgroundColor: source.color },
                          ]}
                        />
                        <View>
                          <Text style={styles.breakdownName}>
                            {source.name}
                          </Text>
                          <Text style={styles.breakdownCount}>
                            {source.count} transactions
                          </Text>
                        </View>
                      </View>
                      <View style={styles.breakdownRight}>
                        <Text style={styles.breakdownAmount}>
                          {formatCurrency(source.amount)}
                        </Text>
                        <Text style={styles.breakdownPercentage}>
                          {source.percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="cash-outline"
                    size={48}
                    color={colors.textMuted}
                  />
                  <Text style={styles.emptyText}>No income recorded</Text>
                </View>
              )}
            </Card>
          </>
        )}

        {/* CASH FLOW TAB */}
        {activeTab === "cashflow" && (
          <>
            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Cash Flow Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      {
                        backgroundColor:
                          cashFlowSummary.net >= 0
                            ? colors.incomeLight
                            : colors.expenseLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="trending-up"
                      size={20}
                      color={
                        cashFlowSummary.net >= 0
                          ? colors.income
                          : colors.expense
                      }
                    />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text
                      style={[
                        styles.summaryValue,
                        {
                          color:
                            cashFlowSummary.net >= 0
                              ? colors.income
                              : colors.expense,
                        },
                      ]}
                    >
                      {formatCompactCurrency(
                        cashFlowSummary.net,
                        currencySymbol,
                      )}
                    </Text>
                    <Text style={styles.summaryLabel}>Net Flow</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {cashFlowSummary.coverage.toFixed(2)}x
                    </Text>
                    <Text style={styles.summaryLabel}>Coverage</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.accentLight },
                    ]}
                  >
                    <Ionicons name="wallet" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {formatCompactCurrency(
                        accountsSummary.totalBalance,
                        currencySymbol,
                      )}
                    </Text>
                    <Text style={styles.summaryLabel}>Net Worth</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.warningLight },
                    ]}
                  >
                    <Ionicons name="water" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {cashFlowSummary.liquidityRatio.toFixed(1)}
                    </Text>
                    <Text style={styles.summaryLabel}>Liquidity</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Trend Chart */}
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.cardTitle}>
                  {selectedPeriod === "year" ? "Monthly" : "Daily"} Trend
                </Text>
                <Text style={styles.chartSubtitle}>
                  Track your income (green) vs expenses (red) over time
                </Text>
              </View>
              <LineChart
                data={{
                  labels: dailyTrend
                    .slice(selectedPeriod === "year" ? 0 : -7)
                    .map((d) => d.label),
                  datasets: [
                    {
                      data: dailyTrend
                        .slice(selectedPeriod === "year" ? 0 : -7)
                        .map((d) => Math.max(d.income, 0)),
                      color: () => colors.income,
                      strokeWidth: 3,
                    },
                    {
                      data: dailyTrend
                        .slice(selectedPeriod === "year" ? 0 : -7)
                        .map((d) => Math.max(d.expense, 0)),
                      color: () => colors.expense,
                      strokeWidth: 3,
                    },
                  ],
                  legend: ["Income", "Expenses"],
                }}
                width={width - spacing.lg * 4}
                height={220}
                chartConfig={{
                  backgroundColor: colors.surface,
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => colors.textMuted,
                  labelColor: (opacity = 1) => colors.textSecondary,
                  style: {
                    borderRadius: borderRadius.md,
                  },
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                  },
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: borderRadius.md,
                }}
                fromZero
              />
            </Card>

            <Card style={styles.chartCard}>
              <Text style={styles.cardTitle}>Cash Flow Waterfall</Text>
              <View style={styles.waterfallChart}>
                {(() => {
                  const maxValue = Math.max(
                    stats.income,
                    stats.expenses,
                    Math.abs(cashFlowSummary.net),
                    1,
                  );
                  const items = [
                    {
                      label: "Income",
                      value: stats.income,
                      color: colors.income,
                    },
                    {
                      label: "Expenses",
                      value: stats.expenses,
                      color: colors.expense,
                    },
                    {
                      label: "Net",
                      value: Math.abs(cashFlowSummary.net),
                      color:
                        cashFlowSummary.net >= 0
                          ? colors.income
                          : colors.expense,
                    },
                  ];

                  return items.map((item) => (
                    <View key={item.label} style={styles.waterfallBarWrapper}>
                      <View
                        style={[
                          styles.waterfallBar,
                          {
                            height: `${(item.value / maxValue) * 100}%`,
                            backgroundColor: item.color,
                          },
                        ]}
                      />
                      <Text style={styles.waterfallLabel}>{item.label}</Text>
                    </View>
                  ));
                })()}
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
                  <Text style={styles.comparisonLabel}>
                    {compareMode === "year" ? "Last Year" : "Last Period"}
                  </Text>
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

        {/* BUDGETS TAB */}
        {activeTab === "budgets" && (
          <>
            <Card style={styles.budgetUsageCard}>
              <Text style={styles.cardTitle}>Budget Overview</Text>
              {budgetsSummary.budgetForPeriod > 0 ? (
                <>
                  <View style={styles.budgetProgressGrid}>
                    {budgetsSummary.budgetUsage
                      .slice(0, 4)
                      .map((budget, index) => {
                        const progress = Math.min(budget.percentage, 100);
                        const circleColor =
                          budget.percentage > 100
                            ? colors.expense
                            : budget.percentage > 85
                              ? colors.warning
                              : colors.income;
                        const size = 80;
                        const strokeWidth = 8;
                        const center = size / 2;
                        const radius = (size - strokeWidth) / 2;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDashoffset =
                          circumference - (progress / 100) * circumference;

                        return (
                          <View
                            key={budget.id}
                            style={styles.budgetProgressItem}
                          >
                            <View
                              style={{
                                width: size,
                                height: size,
                                position: "relative",
                              }}
                            >
                              {/* Background circle */}
                              <View
                                style={{
                                  position: "absolute",
                                  width: size,
                                  height: size,
                                  borderRadius: size / 2,
                                  borderWidth: strokeWidth,
                                  borderColor: colors.border,
                                }}
                              />
                              {/* Progress circle */}
                              <View
                                style={{
                                  position: "absolute",
                                  width: size,
                                  height: size,
                                  borderRadius: size / 2,
                                  borderWidth: strokeWidth,
                                  borderColor: circleColor,
                                  borderRightColor: "transparent",
                                  borderTopColor:
                                    progress < 25 ? "transparent" : circleColor,
                                  borderLeftColor:
                                    progress < 50 ? "transparent" : circleColor,
                                  borderBottomColor:
                                    progress < 75 ? "transparent" : circleColor,
                                  transform: [{ rotate: "-90deg" }],
                                }}
                              />
                              {/* Percentage text */}
                              <View
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <Text
                                  style={[
                                    styles.budgetProgressPercent,
                                    { color: circleColor },
                                  ]}
                                >
                                  {budget.percentage.toFixed(0)}%
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={styles.budgetProgressLabel}
                              numberOfLines={1}
                            >
                              {budget.name}
                            </Text>
                            <Text style={styles.budgetProgressAmount}>
                              {formatCurrency(budget.spent)}
                            </Text>
                          </View>
                        );
                      })}
                  </View>

                  <View style={styles.budgetUsageHeader}>
                    <Text style={styles.budgetUsageLabel}>
                      {formatCurrency(budgetsSummary.spentInPeriod)} spent of{" "}
                      {formatCurrency(budgetsSummary.budgetForPeriod)}
                    </Text>
                    <Text
                      style={[
                        styles.budgetUsagePercent,
                        {
                          color:
                            budgetsSummary.utilization > 100
                              ? colors.expense
                              : budgetsSummary.utilization > 85
                                ? colors.warning
                                : colors.income,
                        },
                      ]}
                    >
                      {budgetsSummary.utilization.toFixed(0)}%
                    </Text>
                  </View>
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

            {budgetsSummary.budgetForPeriod > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.cardTitle}>Budget Distribution</Text>
                  <Text style={styles.chartSubtitle}>
                    Top 5 of {budgetsSummary.budgetUsage.length} budgets
                  </Text>
                </View>
                <PieChart
                  data={budgetsSummary.budgetUsage
                    .slice(0, 5)
                    .map((budget, index) => ({
                      name: budget.name.substring(0, 12),
                      population: Math.round(budget.spent),
                      color: budget.color,
                      legendFontColor: colors.textSecondary,
                      legendFontSize: 12,
                    }))}
                  width={width - spacing.lg * 4}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => colors.primary,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  style={{
                    marginVertical: 8,
                    borderRadius: borderRadius.md,
                  }}
                />
              </Card>
            )}

            {budgetsSummary.budgetForPeriod > 0 && (
              <Card style={styles.budgetUsageCard}>
                <Text style={styles.cardTitle}>Detailed Breakdown</Text>
                {budgetsSummary.budgetUsage.map((budget) => (
                  <View key={budget.id} style={styles.budgetUsageItem}>
                    <View style={styles.budgetUsageLeft}>
                      <View
                        style={[
                          styles.budgetUsageDot,
                          { backgroundColor: budget.color },
                        ]}
                      />
                      <Text style={styles.budgetUsageName}>{budget.name}</Text>
                    </View>
                    <View style={styles.budgetUsageRight}>
                      <Text style={styles.budgetUsageValue}>
                        {formatCurrency(budget.spent)} /{" "}
                        {formatCurrency(budget.limit)}
                      </Text>
                      <Text
                        style={[
                          styles.budgetUsagePercent,
                          budget.percentage > 100 && { color: colors.expense },
                          budget.percentage > 85 &&
                            budget.percentage <= 100 && {
                              color: colors.warning,
                            },
                        ]}
                      >
                        {budget.percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {activeTab === "subscriptions" && (
          <>
            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Subscriptions Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {subscriptionsSummary.activeCount}
                    </Text>
                    <Text style={styles.summaryLabel}>Active</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.expenseLight },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.expense}
                    />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {formatCompactCurrency(
                        subscriptionsSummary.monthlyTotal,
                        currencySymbol,
                      )}
                    </Text>
                    <Text style={styles.summaryLabel}>Monthly</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.warningLight },
                    ]}
                  >
                    <Ionicons
                      name="calendar"
                      size={20}
                      color={colors.warning}
                    />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {formatCompactCurrency(
                        subscriptionAnalytics.annualTotal,
                        currencySymbol,
                      )}
                    </Text>
                    <Text style={styles.summaryLabel}>Annual</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.accentLight },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={colors.accent}
                    />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {subscriptionAnalytics.upcoming.length}
                    </Text>
                    <Text style={styles.summaryLabel}>Upcoming</Text>
                  </View>
                </View>
              </View>
            </Card>

            {subscriptionAnalytics.active.length > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.cardTitle}>Monthly Cost Breakdown</Text>
                  <Text style={styles.chartSubtitle}>
                    Top 5 of {subscriptionAnalytics.active.length} subscriptions
                  </Text>
                </View>
                <PieChart
                  data={subscriptionAnalytics.active
                    .slice(0, 5)
                    .map((sub, index) => {
                      const monthlyAmount =
                        sub.frequency === "daily"
                          ? sub.amount * 30
                          : sub.frequency === "weekly"
                            ? sub.amount * 4
                            : sub.frequency === "monthly"
                              ? sub.amount
                              : sub.amount / 12;
                      const pieColors = [
                        "#e91e63",
                        "#2c2c54",
                        "#ff9800",
                        "#f39c12",
                        "#9b59b6",
                      ];
                      return {
                        name: sub.name.substring(0, 12),
                        population: Math.round(monthlyAmount * 100) / 100,
                        color: pieColors[index % pieColors.length],
                        legendFontColor: colors.textSecondary,
                        legendFontSize: 12,
                      };
                    })}
                  width={width - spacing.lg * 4}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => colors.primary,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  style={{
                    marginVertical: 8,
                    borderRadius: borderRadius.md,
                  }}
                />
              </Card>
            )}

            {subscriptionAnalytics.active.length > 0 && (
              <Card style={styles.chartCard}>
                <Text style={styles.cardTitle}>Cost by Frequency</Text>
                <BarChart
                  data={{
                    labels: ["Daily", "Weekly", "Monthly", "Yearly"],
                    datasets: [
                      {
                        data: [
                          Math.max(
                            Math.round(
                              subscriptionAnalytics.active
                                .filter((s) => s.frequency === "daily")
                                .reduce((sum, s) => sum + s.amount * 30, 0) *
                                100,
                            ) / 100,
                            1,
                          ),
                          Math.max(
                            Math.round(
                              subscriptionAnalytics.active
                                .filter((s) => s.frequency === "weekly")
                                .reduce((sum, s) => sum + s.amount * 4, 0) *
                                100,
                            ) / 100,
                            1,
                          ),
                          Math.max(
                            Math.round(
                              subscriptionAnalytics.active
                                .filter((s) => s.frequency === "monthly")
                                .reduce((sum, s) => sum + s.amount, 0) * 100,
                            ) / 100,
                            1,
                          ),
                          Math.max(
                            Math.round(
                              subscriptionAnalytics.active
                                .filter((s) => s.frequency === "yearly")
                                .reduce((sum, s) => sum + s.amount / 12, 0) *
                                100,
                            ) / 100,
                            1,
                          ),
                        ],
                      },
                    ],
                  }}
                  width={width - spacing.lg * 4}
                  height={220}
                  chartConfig={{
                    backgroundColor: colors.surface,
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => colors.primary,
                    labelColor: () => colors.textSecondary,
                    style: {
                      borderRadius: borderRadius.md,
                    },
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: borderRadius.md,
                  }}
                  fromZero
                  showValuesOnTopOfBars
                />
              </Card>
            )}

            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Upcoming Bills</Text>
              {subscriptionAnalytics.upcoming.length > 0 ? (
                subscriptionAnalytics.upcoming.map((sub) => (
                  <View key={sub.id} style={styles.listRow}>
                    <View>
                      <Text style={styles.listTitle}>{sub.name}</Text>
                      <Text style={styles.listSubtitle}>
                        Due {formatShortDate(sub.nextDueDate)}
                      </Text>
                    </View>
                    <Text style={styles.listValue}>
                      {formatCurrency(sub.amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyInlineText}>No upcoming bills</Text>
              )}
            </Card>
          </>
        )}

        {/* GOALS TAB */}
        {activeTab === "goals" && (
          <>
            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Goals Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Ionicons name="flag" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>{goals.length}</Text>
                    <Text style={styles.summaryLabel}>Active</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.warningLight },
                    ]}
                  >
                    <Ionicons name="trophy" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {formatCompactCurrency(
                        goals.reduce((sum, g) => sum + g.targetAmount, 0),
                        currencySymbol,
                      )}
                    </Text>
                    <Text style={styles.summaryLabel}>Target</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.incomeLight },
                    ]}
                  >
                    <Ionicons name="wallet" size={20} color={colors.income} />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {formatCompactCurrency(
                        goals.reduce((sum, g) => sum + g.currentAmount, 0),
                        currencySymbol,
                      )}
                    </Text>
                    <Text style={styles.summaryLabel}>Saved</Text>
                  </View>
                </View>
                <View style={styles.summaryItem}>
                  <View
                    style={[
                      styles.summaryItemIcon,
                      { backgroundColor: colors.accentLight },
                    ]}
                  >
                    <Ionicons name="pulse" size={20} color={colors.accent} />
                  </View>
                  <View style={styles.summaryItemContent}>
                    <Text style={styles.summaryValue}>
                      {goals.length > 0
                        ? Math.round(
                            goals.reduce(
                              (sum, g) =>
                                sum + (g.currentAmount / g.targetAmount) * 100,
                              0,
                            ) / goals.length,
                          )
                        : 0}
                      %
                    </Text>
                    <Text style={styles.summaryLabel}>Progress</Text>
                  </View>
                </View>
              </View>
            </Card>

            {goals.length > 0 && (
              <Card style={styles.chartCard}>
                <Text style={styles.cardTitle}>Goal Progress</Text>
                <View style={styles.budgetProgressGrid}>
                  {goals.slice(0, 4).map((goal) => {
                    const progress = Math.min(
                      (goal.currentAmount / goal.targetAmount) * 100,
                      100,
                    );
                    const circleColor =
                      progress >= 100
                        ? "#22c55e"
                        : progress >= 75
                          ? "#3b82f6"
                          : progress >= 50
                            ? "#f59e0b"
                            : "#ef4444";
                    const size = 80;
                    const strokeWidth = 8;

                    return (
                      <View key={goal.id} style={styles.budgetProgressItem}>
                        <View
                          style={{
                            width: size,
                            height: size,
                            position: "relative",
                          }}
                        >
                          {/* Background circle */}
                          <View
                            style={{
                              position: "absolute",
                              width: size,
                              height: size,
                              borderRadius: size / 2,
                              borderWidth: strokeWidth,
                              borderColor: colors.border,
                            }}
                          />
                          {/* Progress circle */}
                          <View
                            style={{
                              position: "absolute",
                              width: size,
                              height: size,
                              borderRadius: size / 2,
                              borderWidth: strokeWidth,
                              borderColor: circleColor,
                              borderRightColor: "transparent",
                              borderTopColor:
                                progress < 25 ? "transparent" : circleColor,
                              borderLeftColor:
                                progress < 50 ? "transparent" : circleColor,
                              borderBottomColor:
                                progress < 75 ? "transparent" : circleColor,
                              transform: [{ rotate: "-90deg" }],
                            }}
                          />
                          {/* Percentage text */}
                          <View
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={[
                                styles.budgetProgressPercent,
                                { color: circleColor },
                              ]}
                            >
                              {progress.toFixed(0)}%
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={styles.budgetProgressLabel}
                          numberOfLines={1}
                        >
                          {goal.name}
                        </Text>
                        <Text style={styles.budgetProgressAmount}>
                          {formatCurrency(goal.currentAmount)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {goals.length > 0 && (
              <Card style={styles.chartCard}>
                <Text style={styles.cardTitle}>
                  Savings Projection (12 Months)
                </Text>
                <LineChart
                  data={{
                    labels: ["Now", "3mo", "6mo", "9mo", "12mo"],
                    datasets: [
                      {
                        data: (() => {
                          const totalCurrent = goals.reduce(
                            (sum, g) => sum + g.currentAmount,
                            0,
                          );
                          const totalTarget = goals.reduce(
                            (sum, g) => sum + g.targetAmount,
                            0,
                          );
                          const monthlyIncrease = Math.max(
                            (totalTarget - totalCurrent) / 12,
                            0,
                          );
                          return [
                            Math.max(totalCurrent, 0),
                            Math.max(totalCurrent + monthlyIncrease * 3, 0),
                            Math.max(totalCurrent + monthlyIncrease * 6, 0),
                            Math.max(totalCurrent + monthlyIncrease * 9, 0),
                            Math.max(
                              Math.min(
                                totalCurrent + monthlyIncrease * 12,
                                totalTarget,
                              ),
                              0,
                            ),
                          ];
                        })(),
                      },
                    ],
                  }}
                  width={width - spacing.lg * 4}
                  height={220}
                  chartConfig={{
                    backgroundColor: colors.surface,
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => colors.success,
                    labelColor: () => colors.textSecondary,
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: colors.success,
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: borderRadius.md,
                  }}
                  fromZero
                />
              </Card>
            )}

            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Goals Progress</Text>
              {goals.length > 0 ? (
                goals.map((goal) => {
                  const progress =
                    goal.targetAmount > 0
                      ? (goal.currentAmount / goal.targetAmount) * 100
                      : 0;
                  return (
                    <View key={goal.id} style={styles.goalRow}>
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalTitle}>{goal.name}</Text>
                        <Text style={styles.goalSubtitle}>
                          {formatCurrency(goal.currentAmount)} /{" "}
                          {formatCurrency(goal.targetAmount)}
                        </Text>
                        <View style={styles.goalSummaryBar}>
                          <View
                            style={[
                              styles.goalSummaryBarFill,
                              { width: `${Math.min(progress, 100)}%` },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={styles.goalPercentText}>
                        {progress.toFixed(0)}%
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyInlineText}>No goals set yet</Text>
              )}
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Projection</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(goalProjection.monthlySavings)}
                  </Text>
                  <Text style={styles.summaryLabel}>Monthly Savings</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {goalProjection.monthsToGoal
                      ? `${goalProjection.monthsToGoal.toFixed(1)} mo`
                      : "—"}
                  </Text>
                  <Text style={styles.summaryLabel}>Next Goal ETA</Text>
                </View>
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

            {/* Category Spending Breakdown */}
            {categories.length > 0 && transactions.length > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.cardTitle}>Top Spending Categories</Text>
                  <Text style={styles.chartSubtitle}>
                    Top 5 of{" "}
                    {
                      categories.filter((cat) =>
                        transactions.some(
                          (t) =>
                            t.type === "expense" && t.categoryId === cat.id,
                        ),
                      ).length
                    }{" "}
                    categories
                  </Text>
                </View>
                <BarChart
                  data={(() => {
                    // Calculate spending per category and sort by amount
                    const categorySpending = categories
                      .map((cat) => ({
                        name: cat.name,
                        amount: transactions
                          .filter(
                            (t) =>
                              t.type === "expense" && t.categoryId === cat.id,
                          )
                          .reduce((sum, t) => sum + t.amount, 0),
                      }))
                      .filter((cat) => cat.amount > 0)
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 5);

                    return {
                      labels: categorySpending.map((cat) =>
                        cat.name.substring(0, 7),
                      ),
                      datasets: [
                        {
                          data:
                            categorySpending.length > 0
                              ? categorySpending.map((cat) =>
                                  Math.round(cat.amount),
                                )
                              : [0],
                        },
                      ],
                    };
                  })()}
                  width={width - spacing.lg * 4}
                  height={240}
                  chartConfig={{
                    backgroundColor: colors.surface,
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => colors.expense,
                    labelColor: () => colors.textSecondary,
                    style: {
                      borderRadius: borderRadius.md,
                    },
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: borderRadius.md,
                  }}
                  fromZero
                />
              </Card>
            )}

            {/* Income vs Expenses Trend */}
            {transactions.length > 0 && (
              <Card style={styles.chartCard}>
                <Text style={styles.cardTitle}>
                  Income vs Expenses (7 Days)
                </Text>
                <LineChart
                  data={{
                    labels: (() => {
                      const labels = [];
                      for (let i = 6; i >= 0; i--) {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        labels.push(
                          date.toLocaleDateString("en-US", {
                            weekday: "short",
                          }),
                        );
                      }
                      return labels;
                    })(),
                    datasets: [
                      {
                        data: (() => {
                          const incomeData = [];
                          for (let i = 6; i >= 0; i--) {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            const dayStart = new Date(
                              date.setHours(0, 0, 0, 0),
                            );
                            const dayEnd = new Date(
                              date.setHours(23, 59, 59, 999),
                            );
                            const dayIncome = transactions
                              .filter(
                                (t) =>
                                  t.type === "income" &&
                                  new Date(t.date) >= dayStart &&
                                  new Date(t.date) <= dayEnd,
                              )
                              .reduce((sum, t) => sum + t.amount, 0);
                            incomeData.push(Math.round(dayIncome));
                          }
                          return incomeData;
                        })(),
                        color: (opacity = 1) => colors.income,
                        strokeWidth: 3,
                      },
                      {
                        data: (() => {
                          const expenseData = [];
                          for (let i = 6; i >= 0; i--) {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            const dayStart = new Date(
                              date.setHours(0, 0, 0, 0),
                            );
                            const dayEnd = new Date(
                              date.setHours(23, 59, 59, 999),
                            );
                            const dayExpense = transactions
                              .filter(
                                (t) =>
                                  t.type === "expense" &&
                                  new Date(t.date) >= dayStart &&
                                  new Date(t.date) <= dayEnd,
                              )
                              .reduce((sum, t) => sum + t.amount, 0);
                            expenseData.push(Math.round(dayExpense));
                          }
                          return expenseData;
                        })(),
                        color: (opacity = 1) => colors.expense,
                        strokeWidth: 3,
                      },
                    ],
                    legend: ["Income", "Expenses"],
                  }}
                  width={width - spacing.lg * 4}
                  height={220}
                  chartConfig={{
                    backgroundColor: colors.surface,
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => colors.primary,
                    labelColor: () => colors.textSecondary,
                    propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: borderRadius.md,
                  }}
                />
              </Card>
            )}

            {/* Account Balances */}
            {accounts.length > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.cardTitle}>Account Distribution</Text>
                  <Text style={styles.chartSubtitle}>
                    Top 5 of {accounts.length} accounts
                  </Text>
                </View>
                <PieChart
                  data={accounts.slice(0, 5).map((acc, index) => {
                    const pieColors = [
                      "#3b82f6",
                      "#22c55e",
                      "#f59e0b",
                      "#ef4444",
                      "#8b5cf6",
                    ];
                    return {
                      name: acc.name.substring(0, 12),
                      population: Math.round(Math.abs(acc.balance)),
                      color: pieColors[index % pieColors.length],
                      legendFontColor: colors.textSecondary,
                      legendFontSize: 12,
                    };
                  })}
                  width={width - spacing.lg * 4}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => colors.primary,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  style={{
                    marginVertical: 8,
                    borderRadius: borderRadius.md,
                  }}
                />
              </Card>
            )}

            {/* Financial Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>Tips</Text>
              <Card style={styles.tipCard}>
                <Text style={styles.tipText}>
                  Log every expense; small purchases add up.
                </Text>
              </Card>
              <Card style={styles.tipCard}>
                <Text style={styles.tipText}>
                  Set budgets for your top categories.
                </Text>
              </Card>
              <Card style={styles.tipCard}>
                <Text style={styles.tipText}>
                  Review subscriptions monthly and cancel unused ones.
                </Text>
              </Card>
            </View>
          </>
        )}
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
      paddingVertical: spacing.sm,
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
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    premiumBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.warning,
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
      marginBottom: spacing.sm,
    },
    controlsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    controlChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    controlChipText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    periodButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: "center",
      borderRadius: borderRadius.md,
      minWidth: 0,
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
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      gap: spacing.sm,
      height: 44,
    },
    tabButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      minWidth: 110,
      height: 44,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabButtonActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primaryLight,
    },
    tabButtonText: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    tabButtonTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    scrollView: {
      flex: 1,
      marginTop: -spacing.lg,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: 0,
      maxHeight: "80%",
      width: "100%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalScrollView: {
      maxHeight: 500,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    modalCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: spacing.sm,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing.xxs,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    modalButton: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      minWidth: 100,
      alignItems: "center",
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
    },
    modalButtonSecondary: {
      backgroundColor: colors.surfaceSecondary,
    },
    modalButtonTextPrimary: {
      color: colors.textInverse,
      fontWeight: "600",
    },
    modalButtonTextSecondary: {
      color: colors.textSecondary,
      fontWeight: "600",
    },
    datePickerContainer: {
      gap: spacing.sm,
    },
    datePickerLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    webDateControls: {
      gap: spacing.md,
    },
    webDateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    webDateLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      width: 50,
    },
    webDateButtons: {
      flexDirection: "row",
      gap: spacing.xs,
    },
    webDateButton: {
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    webDateButtonText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    webDateValue: {
      fontSize: 12,
      color: colors.textPrimary,
      minWidth: 80,
      textAlign: "right",
    },
    filterSectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    filterRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingBottom: spacing.xs,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceSecondary,
    },
    filterChipActive: {
      backgroundColor: colors.primaryLight,
    },
    filterChipText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    listRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    listLeftContent: {
      flex: 1,
      minWidth: 0,
    },
    listTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    listSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    listValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      flexShrink: 0,
    },
    goalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    goalInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    goalTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    goalSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginVertical: spacing.xs,
    },
    goalPercentText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
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
      color: colors.textInverse,
    },
    healthScoreBadge: {
      flexDirection: "row",
      alignItems: "baseline",
    },
    healthScoreValue: {
      fontSize: 32,
      fontWeight: "700",
      color: colors.textInverse,
    },
    healthScoreMax: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    healthScoreBar: {
      height: 8,
      backgroundColor: colors.border,
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
      color: colors.textSecondary,
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
      gap: spacing.sm,
    },
    summaryItem: {
      width: "48%",
      backgroundColor: colors.surfaceSecondary,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    summaryItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    summaryItemContent: {
      flex: 1,
      minWidth: 0,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 2,
    },
    summaryLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "500",
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
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
    budgetProgressGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-around",
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    budgetProgressItem: {
      alignItems: "center",
      width: "45%",
      marginBottom: spacing.sm,
    },
    budgetProgressPercent: {
      fontSize: 16,
      fontWeight: "700",
    },
    budgetProgressLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: "center",
      width: "100%",
    },
    budgetProgressAmount: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
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
    budgetUsageRight: {
      alignItems: "flex-end",
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
      color: colors.textInverse,
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
    chartHeader: {
      marginBottom: spacing.sm,
    },
    chartSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
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
    waterfallChart: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: 140,
      justifyContent: "space-around",
      marginTop: spacing.md,
      paddingTop: spacing.sm,
    },
    waterfallBarWrapper: {
      flex: 1,
      alignItems: "center",
    },
    waterfallBar: {
      width: 24,
      borderRadius: 6,
      minHeight: 6,
    },
    waterfallLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: spacing.xs,
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
