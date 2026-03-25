import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  View,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Text } from "react-native-paper";
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
import { AuthProvider } from "../lib/contexts/AuthContext";
import { EntitlementProvider } from "../lib/contexts/EntitlementContext";
import { SyncProvider } from "../lib/contexts/SyncContext";
import { useThemeColors } from "../lib/theme";
import { widgetService } from "../lib/services/WidgetService";
import ErrorBoundary from "../components/ErrorBoundary";
import { Ionicons } from "@expo/vector-icons";

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const initDb = async () => {
    try {
      setDbError(null);
      await initializeDatabase();
      setDbReady(true);

      // Initialize widget data after DB is confirmed ready
      try {
        await widgetService.updateAllWidgets();
      } catch (err) {
        console.warn("Initial widget update failed:", err);
      }
    } catch (error) {
      console.error("Database initialization error:", error);
      setDbError(
        error instanceof Error
          ? error.message
          : "Failed to initialize database",
      );
    }
  };

  useEffect(() => {
    initDb();
  }, []);

  // DB failed to init — show error screen, NOT the app
  if (dbError) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#0B1120",
            padding: 24,
          }}
        >
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              fontWeight: "700",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Unable to Start
          </Text>
          <Text
            style={{
              color: "#94A3B8",
              fontSize: 14,
              marginTop: 8,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            The database could not be initialized. Your data is safe — please
            try again.
          </Text>
          {__DEV__ && (
            <Text
              style={{
                color: "#F87171",
                fontSize: 12,
                marginTop: 12,
                fontFamily: "monospace",
                textAlign: "center",
              }}
            >
              {dbError}
            </Text>
          )}
          <TouchableOpacity
            onPress={initDb}
            style={{
              marginTop: 24,
              backgroundColor: "#6366F1",
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

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
    <ErrorBoundary>
      <SafeAreaProvider>
        <SettingsProvider>
          <AuthProvider>
            <UserProvider>
              <ThemedApp />
            </UserProvider>
          </AuthProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
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
                      <EntitlementProvider>
                        <SyncProvider>
                          <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="onboarding" />
                            <Stack.Screen name="(tabs)" />
                            <Stack.Screen name="(stack)" />
                          </Stack>
                        </SyncProvider>
                      </EntitlementProvider>
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
