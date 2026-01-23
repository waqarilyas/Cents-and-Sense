"use client";

import { View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { Category } from "../lib/database";

interface CategoryCardProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}

export function CategoryCard({
  category,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  return (
    <Card style={{ marginBottom: 12, backgroundColor: "#fafafa" }}>
      <Card.Content>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: category.color,
                marginRight: 12,
              }}
            />
            <Text variant="titleMedium" style={{ fontWeight: "600" }}>
              {category.name}
            </Text>
          </View>
          <View
            style={{
              backgroundColor:
                category.type === "income" ? "#c8e6c9" : "#ffe0b2",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: category.type === "income" ? "#2e7d32" : "#f57c00",
              }}
            >
              {category.type === "income" ? "Income" : "Expense"}
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
