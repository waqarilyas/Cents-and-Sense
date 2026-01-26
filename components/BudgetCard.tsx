"use client";

import { View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { Budget, Category } from "../lib/database";
import { formatCurrency, useThemeColors } from "../lib/theme";

interface BudgetCardProps {
  budget: Budget;
  category: Category | undefined;
  spent: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function BudgetCard({
  budget,
  category,
  spent,
  onEdit,
  onDelete,
}: BudgetCardProps) {
  const { colors } = useThemeColors();
  const percentage = (spent / budget.budget_limit) * 100;
  const isOver = spent > budget.budget_limit;
  const remaining = Math.max(0, budget.budget_limit - spent);

  return (
    <Card
      style={{
        marginBottom: 12,
        backgroundColor: isOver ? colors.errorLight : colors.surface,
      }}
    >
      <Card.Content>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              variant="titleMedium"
              style={{ fontWeight: "600", marginBottom: 4 }}
            >
              {category?.name || "Unknown"}
            </Text>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              <Text variant="labelSmall" style={{ color: colors.textSecondary }}>
                {budget.period === "monthly" ? "Monthly" : "Yearly"} Budget
              </Text>
              <View
                style={{
                  backgroundColor: "#757575",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 3,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
                  {budget.currency}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontWeight: "600",
                fontSize: 16,
                color: isOver ? colors.expense : colors.income,
              }}
            >
              {formatCurrency(spent, budget.currency)}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.textSecondary }}>
              of {formatCurrency(budget.budget_limit, budget.currency)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View
          style={{
            height: 8,
            backgroundColor: colors.border,
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              height: "100%",
              backgroundColor: isOver
                ? colors.expense
                : percentage > 75
                  ? colors.warning
                  : colors.success,
              width: `${Math.min(percentage, 100)}%`,
            }}
          />
        </View>

        {/* Status Text */}
        <View>
          <Text
            variant="labelSmall"
            style={{
              color: isOver ? colors.expense : colors.income,
              fontWeight: "500",
            }}
          >
            {isOver
              ? `Over by ${formatCurrency(spent - budget.budget_limit, budget.currency)}`
              : `${formatCurrency(remaining, budget.currency)} remaining`}
          </Text>
        </View>
      </Card.Content>
      <Card.Actions>
        <Button onPress={onEdit}>Edit</Button>
        <Button onPress={onDelete} textColor={colors.expense}>
          Delete
        </Button>
      </Card.Actions>
    </Card>
  );
}
