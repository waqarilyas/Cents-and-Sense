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
import {
  DEFAULT_SETTINGS,
  loadStoredSettings,
  Settings,
  SettingsProvider,
} from "../lib/contexts/SettingsContext";
import { AuthProvider } from "../lib/contexts/AuthContext";
import { EntitlementProvider } from "../lib/contexts/EntitlementContext";
import { SyncProvider } from "../lib/contexts/SyncContext";
import {
  FeatureFlagsProvider,
  useFeatureFlags,
} from "../lib/contexts/FeatureFlagsContext";
import { useThemeColors } from "../lib/theme";
import { widgetService } from "../lib/services/WidgetService";
import ErrorBoundary from "../components/ErrorBoundary";
import { Ionicons } from "@expo/vector-icons";

export default function RootLayout() {
  const [bootSettings, setBootSettings] = useState<Settings | null>(null);
  const [bootSettingsReady, setBootSettingsReady] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapSettings = async () => {
      try {
        setBootSettings(await loadStoredSettings());
      } catch (error) {
        console.error("Settings bootstrap failed:", error);
        setBootSettings(DEFAULT_SETTINGS);
      } finally {
        setBootSettingsReady(true);
      }
    };

    bootstrapSettings();
  }, []);

  if (!bootSettingsReady || !bootSettings) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <SettingsProvider initialSettings={bootSettings}>
          <BootstrapApp
            dbReady={dbReady}
            dbError={dbError}
            setDbReady={setDbReady}
            setDbError={setDbError}
          />
        </SettingsProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function BootstrapApp({
  dbReady,
  dbError,
  setDbReady,
  setDbError,
}: {
  dbReady: boolean;
  dbError: string | null;
  setDbReady: (value: boolean) => void;
  setDbError: (value: string | null) => void;
}) {
  const { colors } = useThemeColors();

  const initDb = async () => {
    try {
      setDbError(null);
      setDbReady(false);
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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
          padding: 24,
        }}
      >
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.errorLight,
          }}
        >
          <Ionicons name="alert-circle" size={42} color={colors.error} />
        </View>
        <Text
          style={{
            color: colors.textPrimary,
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
            color: colors.textSecondary,
            fontSize: 14,
            marginTop: 8,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          The database could not be initialized. Your data is safe. Please try
          again.
        </Text>
        {__DEV__ && (
          <Text
            style={{
              color: colors.error,
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
            backgroundColor: colors.primary,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: colors.textInverse,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dbReady) {
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
    <FeatureFlagsProvider>
      <AuthProvider>
        <UserProvider>
          <ThemedApp />
        </UserProvider>
      </AuthProvider>
    </FeatureFlagsProvider>
  );
}

function ThemedApp() {
  const { colors, activeTheme } = useThemeColors();
  const { isOnboardingComplete, loading } = useUser();
  const { flags, loading: flagsLoading } = useFeatureFlags();
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
        onPrimary: colors.textInverse,
        onSecondary: colors.textInverse,
        primaryContainer: colors.primaryLight,
        secondaryContainer: colors.accentLight,
        background: colors.background,
        surface: colors.surface,
        surfaceVariant: colors.surfaceSecondary,
        onBackground: colors.textPrimary,
        onSurface: colors.textPrimary,
        onSurfaceVariant: colors.textSecondary,
        outline: colors.border,
        outlineVariant: colors.borderLight,
        error: colors.error,
      },
    };
  }, [activeTheme, colors]);

  // Handle onboarding navigation
  useEffect(() => {
    if (loading || flagsLoading) return;

    const inOnboarding = segments[0] === "onboarding";
    const inStack = segments[0] === "(stack)";
    const currentStackRoute = inStack ? segments.slice(1)[0] ?? "" : "";
    const isDisabledStackRoute =
      (currentStackRoute === "auth" && !flags.authEnabled) ||
      (currentStackRoute === "profile-setup" && !flags.profileSetupEnabled) ||
      (currentStackRoute === "paywall" &&
        (!flags.premiumEnabled || !flags.paywallEnabled)) ||
      (currentStackRoute === "sync-setup" && !flags.syncEnabled) ||
      (currentStackRoute === "analysis" && !flags.analyticsEnabled);

    if (!isOnboardingComplete && !inOnboarding) {
      router.replace("/onboarding");
    } else if (isDisabledStackRoute) {
      router.replace("/(tabs)");
    } else if (isOnboardingComplete && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [flags, flagsLoading, isOnboardingComplete, loading, router, segments]);

  // Show loading while checking onboarding status
  if (loading || flagsLoading) {
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
