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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useUser } from "../../lib/contexts/UserContext";
import {
  spacing,
  borderRadius,
  formatReadableCurrency,
  useThemeColors,
  ThemeColors,
} from "../../lib/theme";
import {
  Card,
  LoadingState,
  Button,
  Input,
  BottomSheet,
  ActionChip,
} from "../../lib/components";
import { getCategoryIcon } from "../../lib/smartCategories";

type CategoryType = "expense" | "income";

const CATEGORY_COLORS = [
  "#F97316",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
  "#A855F7",
  "#EAB308",
  "#3B82F6",
  "#22C55E",
  "#EF4444",
  "#059669",
  "#64748B",
  "#0EA5E9",
  "#D946EF",
];

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    expenseCategories,
    incomeCategories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories,
  } = useCategories();
  const { transactions, refreshTransactions } = useTransactions();
  const { defaultCurrency } = useUser();

  const [activeTab, setActiveTab] = useState<CategoryType>("expense");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [categoryType, setCategoryType] = useState<CategoryType>("expense");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);

  const resetForm = () => {
    setCategoryName("");
    setCategoryColor(CATEGORY_COLORS[0]);
    setCategoryType(activeTab);
    setEditingCategory(null);
  };

  const openEditCategory = (category: {
    id: string;
    name: string;
    color: string;
  }) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryColor(category.color);
    setShowEditModal(true);
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;
    if (!categoryName.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCategory(
        editingCategory.id,
        categoryName.trim(),
        categoryColor,
      );
      setShowEditModal(false);
      resetForm();
      Alert.alert("Success", "Category updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }

    setIsSubmitting(true);
    try {
      await addCategory(categoryName.trim(), categoryType, categoryColor);
      setShowAddModal(false);
      resetForm();
      Alert.alert("Success", "Category added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    // Check if category has transactions
    const hasTransactions = transactions.some((t) => t.categoryId === id);

    if (hasTransactions) {
      Alert.alert(
        "Cannot Delete",
        `The category "${name}" has transactions associated with it. Delete the transactions first.`,
      );
      return;
    }

    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory(id);
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to delete category";
              Alert.alert("Cannot Delete", message);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <LoadingState />;
  }

  const displayCategories =
    activeTab === "expense" ? expenseCategories : incomeCategories;
  const monthlyTransactions = transactions.filter((t) => {
    const now = new Date();
    const tDate = new Date(t.date);
    return (
      t.type === activeTab &&
      tDate.getMonth() === now.getMonth() &&
      tDate.getFullYear() === now.getFullYear()
    );
  });
  const totalThisMonth = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
  const categorySummaries = displayCategories
    .map((category) => {
      const categoryTransactions = monthlyTransactions.filter(
        (t) => t.categoryId === category.id,
      );
      const amount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      const transactionCount = categoryTransactions.length;

      return {
        category,
        amount,
        transactionCount,
        share: totalThisMonth > 0 ? amount / totalThisMonth : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);
  const topCategory = categorySummaries[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.headerTitle}>Categories</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "About Categories",
                "Organize your income and expenses into categories.\n\n" +
                  "\u2022 Expense Categories: Where money goes out\n" +
                  "\u2022 Income Categories: Where money comes in\n" +
                  "\u2022 Each category shows monthly totals\n" +
                  "\u2022 Use categories to set budgets\n\n" +
                  "Use each category card to edit or delete it.\n\n" +
                  "Note: Categories with transactions cannot be deleted.",
                [{ text: "Got it!" }],
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Learn about categories"
          >
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setCategoryType(activeTab);
            setShowAddModal(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${activeTab} category`}
        >
          <Ionicons name="add" size={16} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Add Category</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryPill}>
            <Ionicons
              name={activeTab === "expense" ? "trending-down" : "trending-up"}
              size={16}
              color={colors.primary}
            />
            <Text style={styles.summaryPillText}>
              {activeTab === "expense" ? "Expense view" : "Income view"}
            </Text>
          </View>
          <Text style={styles.summarySubtext}>
            {displayCategories.length} categories
          </Text>
        </View>
        <Text style={styles.summaryLabel}>
          {activeTab === "expense" ? "Total Expenses" : "Total Income"} This
          Month
        </Text>
        <Text
          style={[
            styles.summaryValue,
            { color: activeTab === "expense" ? colors.expense : colors.income },
          ]}
        >
          {activeTab === "expense" ? "-" : "+"}
          {formatReadableCurrency(totalThisMonth, defaultCurrency)}
        </Text>
        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStatCard}>
            <Text style={styles.summaryStatLabel}>Leading Category</Text>
            <Text style={styles.summaryStatValue} numberOfLines={1}>
              {topCategory ? topCategory.category.name : "None yet"}
            </Text>
          </View>
          <View style={styles.summaryStatCard}>
            <Text style={styles.summaryStatLabel}>Top Share</Text>
            <Text style={styles.summaryStatValue}>
              {topCategory ? `${Math.round(topCategory.share * 100)}%` : "0%"}
            </Text>
          </View>
        </View>
      </Card>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "expense" && styles.tabActive]}
          onPress={() => setActiveTab("expense")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "expense" && styles.tabTextActive,
            ]}
          >
            Expenses ({expenseCategories.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "income" && styles.tabActive]}
          onPress={() => setActiveTab("income")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "income" && styles.tabTextActive,
            ]}
          >
            Income ({incomeCategories.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Categories Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([refreshCategories(), refreshTransactions()]);
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <View style={styles.categoriesGrid}>
          {categorySummaries.map(({ category, amount, transactionCount, share }) => {
            const icon = getCategoryIcon(category.name);
            return (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => openEditCategory(category)}
                onLongPress={() =>
                  handleDeleteCategory(category.id, category.name)
                }
                delayLongPress={500}
              >
                <View style={styles.categoryHeader}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color + "20" },
                    ]}
                  >
                    <Ionicons name={icon} size={22} color={category.color} />
                  </View>
                  <View style={styles.categoryBody}>
                    <View style={styles.categoryTitleRow}>
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {category.name}
                      </Text>
                      <Text style={styles.categoryShare}>
                        {Math.round(share * 100)}%
                      </Text>
                    </View>
                    <Text style={styles.categoryMeta}>
                      {transactionCount}{" "}
                      {transactionCount === 1 ? "transaction" : "transactions"}{" "}
                      this month
                    </Text>
                  </View>
                  <View style={styles.categoryAmountWrap}>
                    <Text
                      style={[
                        styles.categorySpending,
                        {
                          color:
                            activeTab === "expense"
                              ? colors.expense
                              : colors.income,
                        },
                      ]}
                    >
                      {formatReadableCurrency(amount, defaultCurrency)}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryProgressTrack}>
                  <View
                    style={[
                      styles.categoryProgressFill,
                      {
                        width: `${Math.max(share * 100, amount > 0 ? 8 : 0)}%`,
                        backgroundColor: category.color,
                      },
                    ]}
                  />
                </View>
                <View style={styles.categoryActions}>
                  <ActionChip
                    label="Edit"
                    compact
                    onPress={() => openEditCategory(category)}
                    accessibilityLabel={`Edit ${category.name}`}
                  />
                  <ActionChip
                    label="Delete"
                    compact
                    variant="danger"
                    onPress={() =>
                      handleDeleteCategory(category.id, category.name)
                    }
                    accessibilityLabel={`Delete ${category.name}`}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {displayCategories.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name={
                  activeTab === "expense"
                    ? "trending-down"
                    : "trending-up"
                }
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>No {activeTab} categories</Text>
            <Text style={styles.emptyDescription}>
              Create categories to better organize your {activeTab}s
            </Text>
            <Button
              title="Add Category"
              onPress={() => {
                setCategoryType(activeTab);
                setShowAddModal(true);
              }}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        )}

        <View style={styles.hintContainer}>
          <Ionicons name="bulb-outline" size={16} color={colors.textMuted} />
          <Text style={styles.hint}>
            Categories include visible edit and delete actions on each card.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Category Modal */}
      <BottomSheet
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add Category"
      >
        {/* Category Type Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              categoryType === "expense" && styles.typeButtonActive,
            ]}
            onPress={() => setCategoryType("expense")}
          >
            <Ionicons
              name="trending-down"
              size={16}
              color={
                categoryType === "expense" ? colors.textInverse : colors.expense
              }
            />
            <Text
              style={[
                styles.typeButtonText,
                categoryType === "expense" && styles.typeButtonTextActive,
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              categoryType === "income" && styles.typeButtonActiveIncome,
            ]}
            onPress={() => setCategoryType("income")}
          >
            <Ionicons
              name="trending-up"
              size={16}
              color={
                categoryType === "income" ? colors.textInverse : colors.income
              }
            />
            <Text
              style={[
                styles.typeButtonText,
                categoryType === "income" && styles.typeButtonTextActive,
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Category Name"
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="e.g., Subscriptions"
        />

        <Text style={styles.colorLabel}>Color</Text>
        <View style={styles.colorGrid}>
          {CATEGORY_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                categoryColor === color && styles.colorOptionSelected,
              ]}
              onPress={() => setCategoryColor(color)}
            >
              {categoryColor === color && (
                <Ionicons name="checkmark" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Preview</Text>
          <View style={[styles.previewCard, { borderColor: categoryColor }]}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: categoryColor + "20" },
              ]}
            >
              <Ionicons
                name={getCategoryIcon(categoryName || "Other")}
                size={22}
                color={categoryColor}
              />
            </View>
            <Text style={styles.categoryName}>
              {categoryName || "Category Name"}
            </Text>
          </View>
        </View>

        <Button
          title={isSubmitting ? "Adding..." : "Add Category"}
          onPress={handleAddCategory}
          disabled={isSubmitting}
          loading={isSubmitting}
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </BottomSheet>

      {/* Edit Category Modal */}
      <BottomSheet
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        title="Edit Category"
      >
        <Input
          label="Category Name"
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="e.g., Subscriptions"
        />

        <Text style={styles.colorLabel}>Color</Text>
        <View style={styles.colorGrid}>
          {CATEGORY_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                categoryColor === color && styles.colorOptionSelected,
              ]}
              onPress={() => setCategoryColor(color)}
            >
              {categoryColor === color && (
                <Ionicons name="checkmark" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={isSubmitting ? "Saving..." : "Save Changes"}
          onPress={handleEditCategory}
          disabled={isSubmitting}
          loading={isSubmitting}
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
    addButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    addButtonText: {
      color: colors.textInverse,
      fontWeight: "600",
      fontSize: 14,
    },
    summaryCard: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.xl,
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    summaryPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primaryLight,
    },
    summaryPillText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    summaryValue: {
      fontSize: 32,
      fontWeight: "700",
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    summarySubtext: {
      fontSize: 12,
      color: colors.textMuted,
    },
    summaryStatsRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
    summaryStatCard: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    },
    summaryStatLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    summaryStatValue: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
      marginTop: 4,
    },
    tabContainer: {
      flexDirection: "row",
      marginHorizontal: spacing.lg,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: borderRadius.md,
      padding: 4,
      marginBottom: spacing.lg,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: "center",
      borderRadius: borderRadius.sm,
    },
    tabActive: {
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.textPrimary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
    },
    categoriesGrid: {
      gap: spacing.md,
    },
    categoryCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    categoryBody: {
      flex: 1,
    },
    categoryTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    categoryMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    categoryAmountWrap: {
      alignItems: "flex-end",
    },
    categoryName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    categorySpending: {
      fontSize: 16,
      fontWeight: "700",
    },
    categoryShare: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    categoryProgressTrack: {
      height: 6,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceSecondary,
      overflow: "hidden",
      marginBottom: spacing.md,
    },
    categoryProgressFill: {
      height: 6,
      borderRadius: borderRadius.full,
    },
    categoryActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      justifyContent: "flex-end",
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
    typeToggle: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    typeButton: {
      flex: 1,
      flexDirection: "row",
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 2,
      borderColor: "transparent",
    },
    typeButtonActive: {
      backgroundColor: colors.expense,
    },
    typeButtonActiveIncome: {
      backgroundColor: colors.income,
    },
    typeButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    typeButtonTextActive: {
      color: colors.textInverse,
    },
    colorLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    colorGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    colorOption: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    colorOptionSelected: {
      borderWidth: 3,
      borderColor: colors.textPrimary,
    },
    colorCheck: {
      color: colors.textInverse,
      fontSize: 18,
      fontWeight: "700",
    },
    previewContainer: {
      marginBottom: spacing.lg,
    },
    previewLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.md,
    },
  });
