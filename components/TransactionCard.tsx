"use client";

import { View, StyleSheet } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Transaction } from "../lib/database";
import { useCategories } from "../lib/contexts/CategoryContext";
import { getCategoryIcon } from "../lib/smartCategories";
import {
  spacing,
  borderRadius,
  formatCurrency,
  useThemeColors,
  ThemeColors,
} from "../lib/theme";

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionCard({
  transaction,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const { getCategory } = useCategories();
  const { colors } = useThemeColors();
  const styles = createStyles(colors);
  const category = getCategory(transaction.categoryId);

  const formattedDate = new Date(transaction.date).toLocaleDateString("en-US", {
    year: "2-digit",
    month: "short",
    day: "numeric",
  });

  const isIncome = transaction.type === "income";
  const icon = category
    ? getCategoryIcon(category.name)
    : "ellipsis-horizontal";
  const categoryColor =
    category?.color || (isIncome ? colors.income : colors.expense);

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.content}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: categoryColor + "15" },
            ]}
          >
            <Ionicons name={icon} size={24} color={categoryColor} />
          </View>

          {/* Details */}
          <View style={styles.details}>
            <Text style={styles.title} numberOfLines={1}>
              {transaction.description || category?.name || "Transaction"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={styles.subtitle}>
                {category?.name} • {formattedDate}
              </Text>
              <View
                style={{
                  backgroundColor: "#757575",
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderRadius: 3,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "600" }}>
                  {transaction.currency}
                </Text>
              </View>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Text
              style={[
                styles.amount,
                { color: isIncome ? colors.income : colors.expense },
              ]}
            >
              {isIncome ? "+" : "-"}
              {formatCurrency(transaction.amount, transaction.currency)}
            </Text>
          </View>
        </View>
      </Card.Content>
      <Card.Actions style={styles.actions}>
        <Button onPress={onEdit} textColor={colors.primary}>
          Edit
        </Button>
        <Button onPress={onDelete} textColor={colors.expense}>
          Delete
        </Button>
      </Card.Actions>
    </Card>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    details: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    amountContainer: {
      alignItems: "flex-end",
    },
    amount: {
      fontSize: 18,
      fontWeight: "700",
    },
    actions: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
