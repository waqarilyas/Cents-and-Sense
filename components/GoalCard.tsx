"use client";

import { View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { Goal } from "../lib/database";
import { formatCurrency } from "../lib/theme";

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const percentage = (goal.currentAmount / goal.targetAmount) * 100;
  const completed = goal.currentAmount >= goal.targetAmount;
  const daysLeft = Math.ceil(
    (goal.deadline - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const isOverdue = daysLeft < 0;

  const formattedDeadline = new Date(goal.deadline).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "2-digit",
    },
  );

  return (
    <Card
      style={{
        marginBottom: 12,
        backgroundColor: completed
          ? "#c8e6c9"
          : isOverdue
            ? "#ffebee"
            : "#fafafa",
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
              {goal.name}
            </Text>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <Text
                variant="labelSmall"
                style={{
                  color: completed ? "#2e7d32" : isOverdue ? "#d32f2f" : "#999",
                  fontWeight: "500",
                }}
              >
                {completed
                  ? "Goal Reached"
                  : isOverdue
                    ? `Overdue by ${Math.abs(daysLeft)} days`
                    : `${daysLeft} days left`}
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
                  {goal.currency}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              variant="titleMedium"
              style={{
                fontWeight: "600",
                color: completed ? "#2e7d32" : "#1565c0",
              }}
            >
              {formatCurrency(goal.currentAmount, goal.currency)}
            </Text>
            <Text variant="labelSmall" style={{ color: "#999" }}>
              of {formatCurrency(goal.targetAmount, goal.currency)}
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
            marginBottom: 8,
          }}
        >
          <View
            style={{
              height: "100%",
              backgroundColor: completed
                ? "#4CAF50"
                : isOverdue
                  ? "#d32f2f"
                  : "#2196F3",
              width: `${Math.min(percentage, 100)}%`,
            }}
          />
        </View>

        <Text variant="labelSmall" style={{ color: "#666" }}>
          Target: {formattedDeadline}
        </Text>
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
