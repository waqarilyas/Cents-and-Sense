import { useCallback, useMemo, useState } from "react";
import {
  SectionList,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Animated,
} from "react-native";
import { Text } from "react-native-paper";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useAccounts } from "../../lib/contexts/AccountContext";
import { useUser } from "../../lib/contexts/UserContext";
import {
  spacing,
  borderRadius,
  formatCurrency,
  formatShortDate,
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
} from "../../lib/components";
import { Transaction } from "../../lib/database";

type TransactionType = "income" | "expense";

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getMonthlyStats,
    refreshTransactions,
  } = useTransactions();
  const { categories, expenseCategories, incomeCategories } = useCategories();
  const { accounts, defaultAccount, refreshAccounts } = useAccounts();
  const { defaultCurrency } = useUser();

  const [activeTab, setActiveTab] = useState<TransactionType>("expense");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [transactionType, setTransactionType] =
    useState<TransactionType>("expense");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const monthlyStats = getMonthlyStats();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAccounts(), refreshTransactions()]);
    setTimeout(() => setRefreshing(false), 500);
  }, [refreshAccounts, refreshTransactions]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategoryId("");
    setAccountId(
      defaultAccount?.id || (accounts.length > 0 ? accounts[0].id : ""),
    );
    setTransactionType("expense");
    setEditingTransaction(null);
  };

  const handleAddTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    if (!categoryId) {
      Alert.alert("Error", "Please select a category");
      return;
    }
    if (!accountId) {
      Alert.alert("Error", "Please select an account");
      return;
    }

    setIsSubmitting(true);
    try {
      await addTransaction(
        accountId,
        categoryId,
        parseFloat(amount),
        description,
        Date.now(),
        transactionType,
      );
      // Refresh accounts in background to show updated balance
      refreshAccounts(); // Non-blocking
      setShowAddModal(false);
      resetForm();
      Alert.alert("Success", "Transaction added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTransaction = async () => {
    if (!editingTransaction) return;
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    if (!categoryId) {
      Alert.alert("Error", "Please select a category");
      return;
    }
    if (!accountId) {
      Alert.alert("Error", "Please select an account");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTransaction(
        editingTransaction.id,
        accountId,
        categoryId,
        parseFloat(amount),
        description,
        editingTransaction.date,
        transactionType,
      );
      // Refresh accounts in background to show updated balance
      refreshAccounts(); // Non-blocking
      setShowEditModal(false);
      resetForm();
      Alert.alert("Success", "Transaction updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setAmount(transaction.amount.toString());
    setDescription(transaction.description);
    setCategoryId(transaction.categoryId);
    setAccountId(transaction.accountId || "");
    setTransactionType(transaction.type);
    setShowEditModal(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      // Note: Account balance is updated within deleteTransaction
      // No need to refresh - optimistic update handles UI
    } catch (error) {
      Alert.alert("Error", "Failed to delete transaction");
    }
  };

  const getMonthGroups = () => {
    const grouped: Record<string, typeof transactions> = {};
    const filteredTx = transactions.filter((t) => t.type === activeTab);

    filteredTx.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(t);
    });

    // Sort transactions within each month by date
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => b.date - a.date);
    });

    return grouped;
  };

  const getCategoryOptions = () => {
    const cats =
      transactionType === "expense" ? expenseCategories : incomeCategories;
    return cats.map((c) => ({
      label: c.name,
      value: c.id,
    }));
  };

  const getAccountOptions = () => {
    return accounts.map((a) => ({
      label: `${a.name} (${formatCurrency(a.balance, a.currency)})`,
      value: a.id,
    }));
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    transactionId: string,
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          Alert.alert(
            "Delete Transaction",
            "Are you sure you want to delete this transaction?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => handleDeleteTransaction(transactionId),
              },
            ],
          );
        }}
      >
        <Animated.View style={{ transform: [{ translateX: trans }] }}>
          <Ionicons name="trash-outline" size={24} color={colors.textInverse} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingState />;
  }

  const monthGroups = getMonthGroups();
  const totalBalance = monthlyStats.income - monthlyStats.expense;

  // Convert month groups to SectionList format
  const sections = Object.entries(monthGroups).map(([month, items]) => ({
    title: month,
    data: items,
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.headerTitle}>Transactions</Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "About Transactions",
                  "Track all your income and expenses.\n\n" +
                    "\u2022 Income: Money received\n" +
                    "\u2022 Expense: Money spent\n" +
                    "\u2022 Assign to categories for organization\n" +
                    "\u2022 Link to accounts to track balances\n\n" +
                    "Swipe left on a transaction to delete it.\n" +
                    "Tap a transaction to edit details.",
                  [{ text: "Got it!" }],
                )
              }
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
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statLabelRow}>
              <Ionicons
                name="wallet-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <Text
              style={[
                styles.statValue,
                { color: totalBalance >= 0 ? colors.income : colors.expense },
              ]}
            >
              {formatCurrency(totalBalance, defaultCurrency)}
            </Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statLabelRow}>
              <Ionicons
                name={
                  activeTab === "income"
                    ? "trending-up-outline"
                    : "trending-down-outline"
                }
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.statLabel}>
                {activeTab === "income" ? "Income" : "Expenses"}
              </Text>
            </View>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    activeTab === "income" ? colors.income : colors.expense,
                },
              ]}
            >
              {activeTab === "income" ? "+" : "-"}
              {formatCurrency(
                activeTab === "income"
                  ? monthlyStats.income
                  : monthlyStats.expense,
                defaultCurrency,
              )}
            </Text>
          </Card>
        </View>

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
              Expenses
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
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Swipe Hint */}
        {Object.keys(monthGroups).length > 0 && (
          <View style={styles.swipeHint}>
            <Ionicons name="arrow-back" size={12} color={colors.textMuted} />
            <Text style={styles.swipeHintText}>
              Swipe to delete, tap to edit.
            </Text>
          </View>
        )}

        {/* Transaction List */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.monthTitle}>{title}</Text>
          )}
          renderItem={({ item: transaction }) => {
            const category = categories.find(
              (c) => c.id === transaction.categoryId,
            );
            const account = accounts.find(
              (a) => a.id === transaction.accountId,
            );
            return (
              <Swipeable
                renderRightActions={(progress, dragX) =>
                  renderRightActions(progress, dragX, transaction.id)
                }
                friction={2}
                rightThreshold={40}
              >
                <TouchableOpacity
                  onPress={() => openEditModal(transaction)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.transactionCard}>
                    <View style={styles.transactionRow}>
                      <View
                        style={[
                          styles.transactionIcon,
                          {
                            backgroundColor:
                              transaction.type === "income"
                                ? `${colors.income}15`
                                : `${colors.expense}15`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            transaction.type === "income"
                              ? "arrow-down"
                              : "arrow-up"
                          }
                          size={20}
                          color={
                            transaction.type === "income"
                              ? colors.income
                              : colors.expense
                          }
                        />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle}>
                          {transaction.description ||
                            category?.name ||
                            "Transaction"}
                        </Text>
                        <Text style={styles.transactionSubtitle}>
                          {formatShortDate(transaction.date)} •{" "}
                          {category?.name || "Uncategorized"}
                          {account ? ` • ${account.name}` : ""}
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
                        {formatCurrency(
                          transaction.amount,
                          transaction.currency,
                        )}
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              </Swipeable>
            );
          }}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={
                    activeTab === "expense"
                      ? "arrow-up-outline"
                      : "arrow-down-outline"
                  }
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>No {activeTab} transactions</Text>
              <Text style={styles.emptyDescription}>
                Start tracking your {activeTab} by adding your first transaction
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  resetForm();
                  setTransactionType(activeTab);
                  setShowAddModal(true);
                }}
              >
                <Text style={styles.emptyButtonText}>Add Transaction</Text>
              </TouchableOpacity>
            </Card>
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
        />

        {/* Add Transaction Modal */}
        <BottomSheet
          visible={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            resetForm();
          }}
          title="Add Transaction"
        >
          {/* Transaction Type Toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                transactionType === "expense" && styles.typeButtonActive,
              ]}
              onPress={() => {
                setTransactionType("expense");
                setCategoryId("");
              }}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={
                  transactionType === "expense"
                    ? colors.textInverse
                    : colors.expense
                }
              />
              <Text
                style={[
                  styles.typeButtonText,
                  transactionType === "expense" && styles.typeButtonTextActive,
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                transactionType === "income" && styles.typeButtonActiveIncome,
              ]}
              onPress={() => {
                setTransactionType("income");
                setCategoryId("");
              }}
            >
              <Ionicons
                name="arrow-down"
                size={16}
                color={
                  transactionType === "income"
                    ? colors.textInverse
                    : colors.income
                }
              />
              <Text
                style={[
                  styles.typeButtonText,
                  transactionType === "income" && styles.typeButtonTextActive,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
          />

          <Select
            label="Category"
            value={categoryId}
            options={getCategoryOptions()}
            onSelect={setCategoryId}
            placeholder="Select a category"
          />

          <Select
            label="Account *"
            value={accountId}
            options={getAccountOptions()}
            onSelect={setAccountId}
            placeholder="Select an account"
          />

          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What was this for?"
          />

          <Button
            title={isSubmitting ? "Adding..." : "Add Transaction"}
            onPress={handleAddTransaction}
            disabled={isSubmitting}
            loading={isSubmitting}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </BottomSheet>

        {/* Edit Transaction Modal */}
        <BottomSheet
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            resetForm();
          }}
          title="Edit Transaction"
        >
          {/* Transaction Type Toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                transactionType === "expense" && styles.typeButtonActive,
              ]}
              onPress={() => {
                setTransactionType("expense");
                setCategoryId("");
              }}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={
                  transactionType === "expense"
                    ? colors.textInverse
                    : colors.expense
                }
              />
              <Text
                style={[
                  styles.typeButtonText,
                  transactionType === "expense" && styles.typeButtonTextActive,
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                transactionType === "income" && styles.typeButtonActiveIncome,
              ]}
              onPress={() => {
                setTransactionType("income");
                setCategoryId("");
              }}
            >
              <Ionicons
                name="arrow-down"
                size={16}
                color={
                  transactionType === "income"
                    ? colors.textInverse
                    : colors.income
                }
              />
              <Text
                style={[
                  styles.typeButtonText,
                  transactionType === "income" && styles.typeButtonTextActive,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
          />

          <Select
            label="Category"
            value={categoryId}
            options={getCategoryOptions()}
            onSelect={setCategoryId}
            placeholder="Select a category"
          />

          <Select
            label="Account *"
            value={accountId}
            options={getAccountOptions()}
            onSelect={setAccountId}
            placeholder="Select an account"
          />

          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What was this for?"
          />

          <Button
            title={isSubmitting ? "Saving..." : "Save Changes"}
            onPress={handleEditTransaction}
            disabled={isSubmitting}
            loading={isSubmitting}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
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
      backgroundColor: colors.surface,
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
    },
    addButtonText: {
      color: colors.textInverse,
      fontWeight: "600",
      fontSize: 14,
    },
    statsContainer: {
      flexDirection: "row",
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    statCard: {
      flex: 1,
      padding: spacing.md,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "700",
    },
    tabContainer: {
      flexDirection: "row",
      marginHorizontal: spacing.lg,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: borderRadius.md,
      padding: 4,
      marginBottom: spacing.md,
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
    monthTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.md,
      marginTop: spacing.md,
    },
    transactionCard: {
      marginBottom: spacing.sm,
      padding: spacing.md,
    },
    transactionRow: {
      flexDirection: "row",
      alignItems: "center",
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
    transactionSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    transactionAmount: {
      fontSize: 15,
      fontWeight: "700",
    },
    transactionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    statLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: spacing.xs,
    },
    emptyCard: {
      padding: spacing.xl,
      alignItems: "center",
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primaryLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    emptyButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    emptyButtonText: {
      color: colors.textInverse,
      fontWeight: "600",
      fontSize: 14,
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
    swipeHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xs,
      gap: 4,
      marginBottom: spacing.sm,
    },
    swipeHintText: {
      fontSize: 11,
      color: colors.textMuted,
    },
    deleteAction: {
      backgroundColor: colors.expense,
      justifyContent: "center",
      alignItems: "center",
      width: 80,
      marginBottom: spacing.sm,
      borderTopRightRadius: borderRadius.md,
      borderBottomRightRadius: borderRadius.md,
    },
  });
