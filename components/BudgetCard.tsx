"use client";

import { View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { Budget, Category } from "../lib/database";
import { formatCurrency } from "../lib/theme";

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
  const percentage = (spent / budget.budget_limit) * 100;
  const isOver = spent > budget.budget_limit;
  const remaining = Math.max(0, budget.budget_limit - spent);

  return (
    <Card
      style={{
        marginBottom: 12,
        backgroundColor: isOver ? "#ffebee" : "#fafafa",
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
            <Text variant="labelSmall" style={{ color: "#999" }}>
              {budget.period === "monthly" ? "Monthly" : "Yearly"} Budget
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontWeight: "600",
                fontSize: 16,
                color: isOver ? "#d32f2f" : "#2e7d32",
              }}
            >
              {formatCurrency(spent, budget.currency)}
            </Text>
            <Text variant="labelSmall" style={{ color: "#999" }}>
              of {formatCurrency(budget.budget_limit, budget.currency)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View
          style={{
            height: 8,
            backgroundColor: "#e0e0e0",
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              height: "100%",
              backgroundColor: isOver
                ? "#d32f2f"
                : percentage > 75
                  ? "#ff9800"
                  : "#4CAF50",
              width: `${Math.min(percentage, 100)}%`,
            }}
          />
        </View>

        {/* Status Text */}
        <View>
          <Text
            variant="labelSmall"
            style={{
              color: isOver ? "#d32f2f" : "#2e7d32",
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
        <Button onPress={onDelete} textColor="#d32f2f">
          Delete
        </Button>
      </Card.Actions>
    </Card>
  );
}
