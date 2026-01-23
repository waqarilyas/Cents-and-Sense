"use client";

import { View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { Account } from "../lib/database";

interface AccountCardProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const getTypeLabel = (type: Account["type"]) => {
    const labels: Record<Account["type"], string> = {
      checking: "Checking",
      savings: "Savings",
      credit_card: "Credit Card",
    };
    return labels[type];
  };

  const getTypeColor = (type: Account["type"]) => {
    const colors: Record<Account["type"], string> = {
      checking: "#2196F3",
      savings: "#4CAF50",
      credit_card: "#FF9800",
    };
    return colors[type];
  };

  return (
    <Card style={{ marginBottom: 12, backgroundColor: "#fafafa" }}>
      <Card.Content>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              variant="titleMedium"
              style={{ fontWeight: "600", marginBottom: 4 }}
            >
              {account.name}
            </Text>
            <View
              style={{
                backgroundColor: getTypeColor(account.type),
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12 }}>
                {getTypeLabel(account.type)}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              variant="titleLarge"
              style={{ fontWeight: "bold", color: "#1565c0" }}
            >
              ${account.balance.toFixed(2)}
            </Text>
          </View>
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
