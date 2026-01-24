import { useMemo, useState } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBudgets } from "../../lib/contexts/BudgetContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useCurrency } from "../../lib/contexts/CurrencyContext";
import {
  spacing,
  borderRadius,
  formatCurrency,
  useThemeColors,
  ThemeColors,
} from "../../lib/theme";
import {
  Card,
  LoadingState,
  Button,
  Input,
  Select,
  BottomSheet,
  ProgressBar,
} from "../../lib/components";
import { Budget } from "../../lib/database";

type Period = Budget["period"];

export default function BudgetsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { defaultCurrency } = useCurrency();
  const {
    budgets,
    monthlyBudget,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
    setMonthlyBudget,
    clearMonthlyBudget,
  } = useBudgets();
  const { categories, expenseCategories } = useCategories();
  const { transactions } = useTransactions();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMonthlyBudgetModal, setShowMonthlyBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [categoryId, setCategoryId] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monthlyBudgetValue, setMonthlyBudgetValue] = useState("");
  const [isMonthlySubmitting, setIsMonthlySubmitting] = useState(false);

  const getBudgetProgress = (budget: Budget) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const spent = transactions
      .filter((t) => {
        const tDate = new Date(t.date);
        const matchesCategory = t.categoryId === budget.categoryId;
        const matchesType = t.type === "expense";
        const matchesPeriod =
          budget.period === "monthly"
            ? tDate.getMonth() === currentMonth &&
              tDate.getFullYear() === currentYear
            : tDate.getFullYear() === currentYear;
        return matchesCategory && matchesType && matchesPeriod;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const percentage = Math.min((spent / budget.budget_limit) * 100, 100);
    const remaining = Math.max(budget.budget_limit - spent, 0);
    const isOver = spent > budget.budget_limit;

    return { spent, percentage, remaining, isOver };
  };

  const resetForm = () => {
    setCategoryId("");
    setBudgetLimit("");
    setPeriod("monthly");
    setEditingBudget(null);
  };

  const openMonthlyBudgetModal = () => {
    setMonthlyBudgetValue(
      monthlyBudget?.amount ? monthlyBudget.amount.toString() : "",
    );
    setShowMonthlyBudgetModal(true);
  };

  const handleSaveMonthlyBudget = async () => {
    if (!monthlyBudgetValue || parseFloat(monthlyBudgetValue) <= 0) {
      Alert.alert("Error", "Please enter a valid monthly budget amount");
      return;
    }
    setIsMonthlySubmitting(true);
    try {
      await setMonthlyBudget(parseFloat(monthlyBudgetValue));
      setShowMonthlyBudgetModal(false);
      Alert.alert("Success", "Overall monthly budget updated!");
    } catch (error) {
      Alert.alert("Error", "Failed to update monthly budget. Try again.");
    } finally {
      setIsMonthlySubmitting(false);
    }
  };

  const handleClearMonthlyBudget = () => {
    Alert.alert(
      "Clear Overall Budget",
      "Remove the overall monthly budget for this month?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearMonthlyBudget();
            } catch (error) {
              Alert.alert("Error", "Failed to clear monthly budget");
            }
          },
        },
      ],
    );
  };

  const handleAddBudget = async () => {
    if (!categoryId) {
      Alert.alert("Error", "Please select a category");
      return;
    }
    if (!budgetLimit || parseFloat(budgetLimit) <= 0) {
      Alert.alert("Error", "Please enter a valid budget amount");
      return;
    }

    // Check if budget already exists for this category
    const existingBudget = budgets.find((b) => b.categoryId === categoryId);
    if (existingBudget) {
      Alert.alert(
        "Error",
        "A budget already exists for this category. Edit or delete it first.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await addBudget(
        categoryId,
        parseFloat(budgetLimit),
        period,
        defaultCurrency.code,
        true, // Enable carryover by default
      );
      setShowAddModal(false);
      resetForm();
      Alert.alert("Success", "Budget created successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to create budget. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBudget = async () => {
    if (!editingBudget) return;
    if (!budgetLimit || parseFloat(budgetLimit) <= 0) {
      Alert.alert("Error", "Please enter a valid budget amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateBudget(editingBudget.id, parseFloat(budgetLimit), period);
      setShowEditModal(false);
      resetForm();
      Alert.alert("Success", "Budget updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update budget. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = (budget: Budget) => {
    const category = categories.find((c) => c.id === budget.categoryId);
    Alert.alert(
      "Delete Budget",
      `Are you sure you want to delete the budget for "${category?.name || "Unknown"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBudget(budget.id);
            } catch (error) {
              Alert.alert("Error", "Failed to delete budget");
            }
          },
        },
      ],
    );
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setCategoryId(budget.categoryId);
    setBudgetLimit(budget.budget_limit.toString());
    setPeriod(budget.period);
    setShowEditModal(true);
  };

  // Categories that don't have a budget yet
  const availableCategories = expenseCategories.filter(
    (c) => !budgets.find((b) => b.categoryId === c.id),
  );

  if (loading) {
    return <LoadingState />;
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const budgetsWithProgress = budgets.map((budget) => ({
    ...budget,
    category: categories.find((c) => c.id === budget.categoryId),
    ...getBudgetProgress(budget),
  }));

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budget_limit, 0);
  const totalSpent = budgetsWithProgress.reduce((sum, b) => sum + b.spent, 0);
  const totalSpentAll = transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      return (
        t.type === "expense" &&
        tDate.getMonth() === currentMonth &&
        tDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const summaryBudget = monthlyBudget?.amount ?? totalBudgeted;
  const summarySpent = monthlyBudget ? totalSpentAll : totalSpent;
  const overallPercentage =
    summaryBudget > 0 ? (summarySpent / summaryBudget) * 100 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budgets</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryLabel}>
              {monthlyBudget ? "Overall Monthly Budget" : "Monthly Budget"}
            </Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(summaryBudget)}
            </Text>
          </View>
          <View style={styles.summaryStats}>
            <Text
              style={[
                styles.summaryPercentage,
                {
                  color:
                    overallPercentage > 100
                      ? colors.error
                      : overallPercentage > 80
                        ? colors.warning
                        : colors.primary,
                },
              ]}
            >
              {overallPercentage.toFixed(0)}%
            </Text>
            <Text style={styles.summaryUsed}>used</Text>
          </View>
        </View>
        <ProgressBar
          progress={Math.min(overallPercentage, 100)}
          color={
            overallPercentage > 100
              ? colors.error
              : overallPercentage > 80
                ? colors.warning
                : colors.primary
          }
          height={8}
        />
        <View style={styles.summaryFooter}>
          <Text style={styles.summaryFooterText}>
            {formatCurrency(summarySpent)} spent of{" "}
            {formatCurrency(summaryBudget)}
          </Text>
          <Text
            style={[
              styles.summaryRemaining,
              {
                color:
                  summaryBudget - summarySpent >= 0
                    ? colors.income
                    : colors.error,
              },
            ]}
          >
            {formatCurrency(Math.max(summaryBudget - summarySpent, 0))}{" "}
            remaining
          </Text>
        </View>
        <View style={styles.overallBudgetActions}>
          <TouchableOpacity onPress={openMonthlyBudgetModal}>
            <Text style={styles.overallBudgetActionText}>
              {monthlyBudget ? "Edit Overall Budget" : "Set Overall Budget"}
            </Text>
          </TouchableOpacity>
          {monthlyBudget && (
            <TouchableOpacity onPress={handleClearMonthlyBudget}>
              <Text
                style={[
                  styles.overallBudgetActionText,
                  { color: colors.error },
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>

      {/* Budgets List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(false)}
            colors={[colors.primary]}
          />
        }
      >
        {budgetsWithProgress.length > 0 ? (
          budgetsWithProgress.map((budget) => (
            <TouchableOpacity
              key={budget.id}
              onPress={() => openEditModal(budget)}
              onLongPress={() => handleDeleteBudget(budget)}
              delayLongPress={500}
            >
              <Card
                style={[
                  styles.budgetCard,
                  budget.isOver && styles.budgetCardOver,
                ]}
              >
                <View style={styles.budgetHeader}>
                  <View
                    style={[
                      styles.budgetIcon,
                      {
                        backgroundColor:
                          (budget.category?.color || colors.primary) + "20",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.budgetDot,
                        {
                          backgroundColor:
                            budget.category?.color || colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.budgetInfo}>
                    <Text style={styles.budgetName}>
                      {budget.category?.name || "Unknown Category"}
                    </Text>
                    <Text style={styles.budgetPeriod}>
                      {budget.period === "monthly" ? "Monthly" : "Yearly"}{" "}
                      Budget
                    </Text>
                  </View>
                  <View style={styles.budgetAmounts}>
                    <Text
                      style={[
                        styles.budgetSpent,
                        {
                          color: budget.isOver
                            ? colors.error
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {formatCurrency(budget.spent)}
                    </Text>
                    <Text style={styles.budgetLimit}>
                      of {formatCurrency(budget.budget_limit)}
                    </Text>
                  </View>
                </View>
                <ProgressBar
                  progress={budget.percentage}
                  color={
                    budget.isOver
                      ? colors.error
                      : budget.percentage > 80
                        ? colors.warning
                        : colors.primary
                  }
                  height={6}
                />
                <View style={styles.budgetFooter}>
                  <Text
                    style={[
                      styles.budgetRemaining,
                      {
                        color: budget.isOver
                          ? colors.error
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {budget.isOver
                      ? `Over budget by ${formatCurrency(budget.spent - budget.budget_limit)}`
                      : `${formatCurrency(budget.remaining)} remaining`}
                  </Text>
                  <Text style={styles.budgetPercentage}>
                    {budget.percentage.toFixed(0)}%
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="pie-chart-outline"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>No budgets yet</Text>
            <Text style={styles.emptyDescription}>
              Create budgets to track spending by category.
            </Text>
            <Button
              title="Create Budget"
              onPress={() => setShowAddModal(true)}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        )}

        {budgetsWithProgress.length > 0 && (
          <View style={styles.hintContainer}>
            <Ionicons name="bulb-outline" size={16} color={colors.textMuted} />
            <Text style={styles.hint}>Tap to edit, long press to delete.</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Budget Modal */}
      <BottomSheet
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Create Budget"
      >
        <Select
          label="Category"
          value={categoryId}
          options={availableCategories.map((c) => ({
            label: c.name,
            value: c.id,
          }))}
          onSelect={setCategoryId}
          placeholder={
            availableCategories.length > 0
              ? "Select a category"
              : "All categories have budgets"
          }
        />

        <Input
          label="Budget Limit"
          value={budgetLimit}
          onChangeText={setBudgetLimit}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <View style={styles.periodSelector}>
          <Text style={styles.periodLabel}>Period</Text>
          <View style={styles.periodOptions}>
            <TouchableOpacity
              style={[
                styles.periodOption,
                period === "monthly" && styles.periodOptionActive,
              ]}
              onPress={() => setPeriod("monthly")}
            >
              <Text
                style={[
                  styles.periodOptionText,
                  period === "monthly" && styles.periodOptionTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodOption,
                period === "yearly" && styles.periodOptionActive,
              ]}
              onPress={() => setPeriod("yearly")}
            >
              <Text
                style={[
                  styles.periodOptionText,
                  period === "yearly" && styles.periodOptionTextActive,
                ]}
              >
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button
          title={isSubmitting ? "Creating..." : "Create Budget"}
          onPress={handleAddBudget}
          disabled={isSubmitting || availableCategories.length === 0}
          loading={isSubmitting}
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </BottomSheet>

      {/* Edit Budget Modal */}
      <BottomSheet
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        title="Edit Budget"
      >
        <View style={styles.editCategoryInfo}>
          <Text style={styles.editCategoryLabel}>Category</Text>
          <Text style={styles.editCategoryName}>
            {categories.find((c) => c.id === categoryId)?.name || "Unknown"}
          </Text>
        </View>

        <Input
          label="Budget Limit"
          value={budgetLimit}
          onChangeText={setBudgetLimit}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <View style={styles.periodSelector}>
          <Text style={styles.periodLabel}>Period</Text>
          <View style={styles.periodOptions}>
            <TouchableOpacity
              style={[
                styles.periodOption,
                period === "monthly" && styles.periodOptionActive,
              ]}
              onPress={() => setPeriod("monthly")}
            >
              <Text
                style={[
                  styles.periodOptionText,
                  period === "monthly" && styles.periodOptionTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodOption,
                period === "yearly" && styles.periodOptionActive,
              ]}
              onPress={() => setPeriod("yearly")}
            >
              <Text
                style={[
                  styles.periodOptionText,
                  period === "yearly" && styles.periodOptionTextActive,
                ]}
              >
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.editActions}>
          <Button
            title="Delete"
            onPress={() => {
              if (editingBudget) {
                setShowEditModal(false);
                handleDeleteBudget(editingBudget);
              }
            }}
            variant="danger"
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            title={isSubmitting ? "Saving..." : "Save Changes"}
            onPress={handleEditBudget}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={{ flex: 2 }}
          />
        </View>
      </BottomSheet>

      {/* Overall Monthly Budget Modal */}
      <BottomSheet
        visible={showMonthlyBudgetModal}
        onClose={() => setShowMonthlyBudgetModal(false)}
        title="Overall Monthly Budget"
      >
        <Input
          label="Monthly Budget"
          value={monthlyBudgetValue}
          onChangeText={setMonthlyBudgetValue}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <Button
          title={isMonthlySubmitting ? "Saving..." : "Save Budget"}
          onPress={handleSaveMonthlyBudget}
          disabled={isMonthlySubmitting}
          loading={isMonthlySubmitting}
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </BottomSheet>
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
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backButton: {
      paddingVertical: spacing.sm,
    },
    backButtonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: "600",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    addButtonText: {
      color: colors.textInverse,
      fontWeight: "600",
      fontSize: 14,
    },
    summaryCard: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
    },
    summaryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing.md,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryAmount: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
      marginTop: 4,
    },
    summaryStats: {
      alignItems: "flex-end",
    },
    summaryPercentage: {
      fontSize: 24,
      fontWeight: "700",
    },
    summaryUsed: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    summaryFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.md,
    },
    summaryFooterText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    summaryRemaining: {
      fontSize: 13,
      fontWeight: "600",
    },
    overallBudgetActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.md,
    },
    overallBudgetActionText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
    },
    budgetCard: {
      marginBottom: spacing.md,
    },
    budgetCardOver: {
      borderWidth: 1,
      borderColor: colors.error,
      backgroundColor: colors.errorLight,
    },
    budgetHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    budgetIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    budgetDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    budgetInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    budgetName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    budgetPeriod: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    budgetAmounts: {
      alignItems: "flex-end",
    },
    budgetSpent: {
      fontSize: 16,
      fontWeight: "700",
    },
    budgetLimit: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    budgetFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.sm,
    },
    budgetRemaining: {
      fontSize: 12,
    },
    budgetPercentage: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xxxl,
    },
    emptyIconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primaryLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: spacing.xl,
    },
    hintContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: spacing.lg,
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
    },
    periodSelector: {
      marginBottom: spacing.lg,
    },
    periodLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    periodOptions: {
      flexDirection: "row",
      gap: spacing.md,
    },
    periodOption: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    periodOptionActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    periodOptionText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    periodOptionTextActive: {
      color: colors.primary,
    },
    editCategoryInfo: {
      marginBottom: spacing.lg,
      padding: spacing.md,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: borderRadius.md,
    },
    editCategoryLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    editCategoryName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    editActions: {
      flexDirection: "row",
      marginTop: spacing.lg,
    },
  });
