import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, StatusBar } from "react-native";
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initializeDatabase } from "../lib/database";
import { UserProvider, useUser } from "../lib/contexts/UserContext";
import { AccountProvider } from "../lib/contexts/AccountContext";
import { CategoryProvider } from "../lib/contexts/CategoryContext";
import { TransactionProvider } from "../lib/contexts/TransactionContext";
import { BudgetProvider } from "../lib/contexts/BudgetContext";
import { GoalProvider } from "../lib/contexts/GoalContext";
import { SubscriptionProvider } from "../lib/contexts/SubscriptionContext";
import { CurrencyProvider } from "../lib/contexts/CurrencyContext";
import { SettingsProvider } from "../lib/contexts/SettingsContext";
import { useThemeColors } from "../lib/theme";
import { widgetService } from "../lib/services/WidgetService";

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeDatabase();
        setDbReady(true);
        
        // Initialize widget data on app start (after a delay to ensure DB is ready)
        setTimeout(async () => {
          try {
            console.log('Initializing widget data...');
            await widgetService.updateAllWidgets();
            console.log('Widget data initialized successfully');
          } catch (err) {
            console.warn('Initial widget update failed:', err);
          }
        }, 2000);
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
        <UserProvider>
          <ThemedApp />
        </UserProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { colors, activeTheme } = useThemeColors();
  const { isOnboardingComplete, loading } = useUser();
  const router = useRouter();
  const segments = useSegments();

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

  // Handle onboarding navigation
  useEffect(() => {
    if (loading) return;

    const inOnboarding = segments[0] === "onboarding";

    if (!isOnboardingComplete && !inOnboarding) {
      // User hasn't completed onboarding, redirect to onboarding
      router.replace("/onboarding");
    } else if (isOnboardingComplete && inOnboarding) {
      // User has completed onboarding but is on onboarding screen, redirect to main app
      router.replace("/(tabs)");
    }
  }, [isOnboardingComplete, loading, segments]);

  // Show loading while checking onboarding status
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
                        <Stack.Screen name="onboarding" />
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
