import { useCallback, useState, useMemo } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Animated,
  TextInput,
} from "react-native";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useAccounts } from "../../lib/contexts/AccountContext";
import {
  spacing,
  borderRadius,
  formatCurrency,
  formatShortDate,
} from "../../lib/theme";
import { useThemeColors, ThemeColors } from "../../lib/theme";
import { Card, LoadingState } from "../../lib/components";
import { getCategoryIcon } from "../../lib/smartCategories";

type FilterType = "all" | "income" | "expense";

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { transactions, loading, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { accounts, refreshAccounts } = useAccounts();

  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAccounts();
    setTimeout(() => setRefreshing(false), 500);
  }, [refreshAccounts]);

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      await refreshAccounts();
    } catch (error) {
      Alert.alert("Error", "Failed to delete transaction");
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply type filter
    if (filter !== "all") {
      filtered = filtered.filter((t) => t.type === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        return (
          t.description?.toLowerCase().includes(query) ||
          category?.name.toLowerCase().includes(query)
        );
      });
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => b.date - a.date);
  }, [transactions, filter, searchQuery, categories]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};

    filteredTransactions.forEach((t) => {
      const date = new Date(t.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;
      if (date.toDateString() === today.toDateString()) {
        dateKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = "Yesterday";
      } else {
        dateKey = date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });

    return groups;
  }, [filteredTransactions]);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    transactionId: string,
  ) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          Alert.alert("Delete Transaction", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => handleDeleteTransaction(transactionId),
            },
          ]);
        }}
      >
        <Ionicons name="trash-outline" size={24} color="#FFF" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>History</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/(stack)/profile")}
          >
            <Ionicons
              name="person-circle-outline"
              size={32}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {(["all", "expense", "income"] as FilterType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                filter === type && styles.filterChipActive,
              ]}
              onPress={() => setFilter(type)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === type && styles.filterChipTextActive,
                ]}
              >
                {type === "all"
                  ? "All"
                  : type === "income"
                    ? "Income"
                    : "Expenses"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transaction List */}
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
          {Object.keys(groupedTransactions).length > 0 ? (
            Object.entries(groupedTransactions).map(([date, items]) => (
              <View key={date} style={styles.dateSection}>
                <Text style={styles.dateTitle}>{date}</Text>
                {items.map((transaction) => {
                  const category = categories.find(
                    (c) => c.id === transaction.categoryId,
                  );
                  const account = accounts.find(
                    (a) => a.id === transaction.accountId,
                  );
                  return (
                    <Swipeable
                      key={transaction.id}
                      renderRightActions={(progress, dragX) =>
                        renderRightActions(progress, dragX, transaction.id)
                      }
                      friction={2}
                      rightThreshold={40}
                    >
                      <Card style={styles.transactionCard}>
                        <View style={styles.transactionRow}>
                          <View
                            style={[
                              styles.transactionIcon,
                              {
                                backgroundColor: category?.color
                                  ? `${category.color}15`
                                  : transaction.type === "income"
                                    ? `${colors.income}15`
                                    : `${colors.expense}15`,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                category
                                  ? getCategoryIcon(category.name)
                                  : "ellipsis-horizontal"
                              }
                              size={20}
                              color={
                                category?.color ||
                                (transaction.type === "income"
                                  ? colors.income
                                  : colors.expense)
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
                            {formatCurrency(transaction.amount)}
                          </Text>
                        </View>
                      </Card>
                    </Swipeable>
                  );
                })}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={64}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? "No matching transactions"
                  : "No transactions yet"}
              </Text>
              <Text style={styles.emptyDescription}>
                {searchQuery
                  ? "Try a different search term"
                  : "Tap the + button to add your first expense"}
              </Text>
            </View>
          )}

          {/* Bottom spacing for tab bar */}
          <View style={{ height: 120 }} />
        </ScrollView>
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
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    profileButton: {
      padding: spacing.xs,
    },
    searchContainer: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      marginLeft: spacing.sm,
      fontSize: 16,
      color: colors.textPrimary,
    },
    filterContainer: {
      flexDirection: "row",
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: "#FFFFFF",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
    },
    dateSection: {
      marginBottom: spacing.lg,
    },
    dateTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    transactionCard: {
      marginBottom: spacing.sm,
      padding: spacing.md,
    },
    transactionRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    transactionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    transactionInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    transactionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    transactionSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: "700",
    },
    deleteAction: {
      backgroundColor: colors.expense,
      justifyContent: "center",
      alignItems: "center",
      width: 80,
      marginBottom: spacing.sm,
      borderRadius: borderRadius.md,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xxxl,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
      marginTop: spacing.lg,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: "center",
    },
  });
