import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, StatusBar } from "react-native";
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initializeDatabase } from "../lib/database";
import { AccountProvider } from "../lib/contexts/AccountContext";
import { CategoryProvider } from "../lib/contexts/CategoryContext";
import { TransactionProvider } from "../lib/contexts/TransactionContext";
import { BudgetProvider } from "../lib/contexts/BudgetContext";
import { GoalProvider } from "../lib/contexts/GoalContext";
import { SubscriptionProvider } from "../lib/contexts/SubscriptionContext";
import { CurrencyProvider } from "../lib/contexts/CurrencyContext";
import { SettingsProvider } from "../lib/contexts/SettingsContext";
import { useThemeColors } from "../lib/theme";

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
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#0B1120",
          }}
        >
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemedApp />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { colors, activeTheme } = useThemeColors();
  const paperTheme = useMemo(() => {
    const base = activeTheme === "dark" ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        secondary: colors.accent,
        background: colors.background,
        surface: colors.surface,
        error: colors.error,
      },
    };
  }, [activeTheme, colors]);

  return (
    <>
      <StatusBar
        barStyle={activeTheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <PaperProvider theme={paperTheme}>
        <CurrencyProvider>
          <AccountProvider>
            <CategoryProvider>
              <TransactionProvider>
                <BudgetProvider>
                  <GoalProvider>
                    <SubscriptionProvider>
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="(stack)" />
                      </Stack>
                    </SubscriptionProvider>
                  </GoalProvider>
                </BudgetProvider>
              </TransactionProvider>
            </CategoryProvider>
          </AccountProvider>
        </CurrencyProvider>
      </PaperProvider>
    </>
  );
}
