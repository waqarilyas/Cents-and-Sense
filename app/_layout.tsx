import { useEffect, useState } from "react";
import { ActivityIndicator, View, StatusBar } from "react-native";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initializeDatabase } from "../lib/database";
import { AccountProvider } from "../lib/contexts/AccountContext";
import { CategoryProvider } from "../lib/contexts/CategoryContext";
import { TransactionProvider } from "../lib/contexts/TransactionContext";
import { BudgetProvider } from "../lib/contexts/BudgetContext";
import { GoalProvider } from "../lib/contexts/GoalContext";
import { SubscriptionProvider } from "../lib/contexts/SubscriptionContext";
import { colors } from "../lib/theme";

// Custom Paper theme
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.accent,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
  },
};

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeDatabase();
        setDbReady(true);
      } catch (error) {
        console.error("Database initialization error:", error);
        setDbReady(true);
      }
    };

    initDb();
  }, []);

  if (!dbReady) {
    return (
      <SafeAreaProvider>
        <View style={{ 
          flex: 1, 
          justifyContent: "center", 
          alignItems: "center",
          backgroundColor: colors.background 
        }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
      <PaperProvider theme={theme}>
        <AccountProvider>
          <CategoryProvider>
            <TransactionProvider>
              <BudgetProvider>
                <GoalProvider>
                  <SubscriptionProvider>
                    <Slot />
                  </SubscriptionProvider>
                </GoalProvider>
              </BudgetProvider>
            </TransactionProvider>
          </CategoryProvider>
        </AccountProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
