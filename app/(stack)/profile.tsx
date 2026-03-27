import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  spacing,
  borderRadius,
  useThemeColors,
  ThemeColors,
  ThemeMode,
} from "../../lib/theme";
import { Card } from "../../lib/components";
import { useAccounts } from "../../lib/contexts/AccountContext";
import { useGoals } from "../../lib/contexts/GoalContext";
import { useBudgets } from "../../lib/contexts/BudgetContext";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useSubscriptions } from "../../lib/contexts/SubscriptionContext";
import { useCurrency } from "../../lib/contexts/CurrencyContext";
import { useUser } from "../../lib/contexts/UserContext";
import { useAuth } from "../../lib/contexts/AuthContext";
import { useEntitlements } from "../../lib/contexts/EntitlementContext";
import { useSync } from "../../lib/contexts/SyncContext";
import { billingService } from "../../lib/services/BillingService";
import {
  useSettings,
  SubscriptionProcessingMode,
} from "../../lib/contexts/SettingsContext";
import { CurrencyDropdown } from "../../lib/components/CurrencyPicker";
import { getCurrency } from "../../lib/currencies";
import { useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  exportAllData,
  deleteAllData,
  generateLargeDebugData,
} from "../../lib/utils/dataManagement";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string | number;
  showArrow?: boolean;
}

const SUBSCRIPTION_MODE_LABELS: Record<SubscriptionProcessingMode, string> = {
  auto: "Auto-add to expenses",
  notify: "Ask before adding",
  manual: "Manual only",
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme, setTheme } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { accounts, refreshAccounts } = useAccounts();
  const { goals, refreshGoals } = useGoals();
  const { refreshBudgets } = useBudgets();
  const { transactions, refreshTransactions } = useTransactions();
  const { refreshCategories } = useCategories();
  const { refreshSubscriptions } = useSubscriptions();
  const { defaultCurrencyCode, setDefaultCurrency } = useCurrency();
  const { settings, updateSetting } = useSettings();
  const { userName, updateDefaultCurrency, refreshUserProfile } = useUser();
  const { authState, email, userId, signOut } = useAuth();
  const { isPremium, source, restorePurchases } = useEntitlements();
  const { syncNow, syncStatus, lastSyncAt, syncError, unsyncedChanges, isOnline } =
    useSync();

  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // Get current currency info for display
  const currentCurrency = getCurrency(defaultCurrencyCode);

  // Handle subscription mode change
  const handleSubscriptionModeChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Subscription Processing",
      "Choose how subscriptions are added to your expenses when due:",
      [
        {
          text: "Auto-add",
          onPress: () => updateSetting("subscriptionProcessingMode", "auto"),
        },
        {
          text: "Ask Me First",
          onPress: () => updateSetting("subscriptionProcessingMode", "notify"),
        },
        {
          text: "Manual Only",
          onPress: () => updateSetting("subscriptionProcessingMode", "manual"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
    );
  };

  const handleThemeChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Appearance", "Choose your theme", [
      { text: "System", onPress: () => setTheme("system" as ThemeMode) },
      { text: "Light", onPress: () => setTheme("light" as ThemeMode) },
      { text: "Dark", onPress: () => setTheme("dark" as ThemeMode) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const profileSubtitle =
    authState === "guest"
      ? "Guest mode. Sign in to sync across devices."
      : email
      ? `Signed in as ${email}`
      : "Signed in account";

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Account & Sync",
      items: [
        {
          icon: authState === "guest" ? "person-add" : "person-circle",
          label: authState === "guest" ? "Sign In for Cloud Sync" : "Account",
          subtitle:
            authState === "guest"
              ? `Guest mode • ${isOnline ? "Online" : "Offline"}`
              : `${email || "Signed in"} • ${isPremium ? `Premium (${source})` : "Free"} • ${isOnline ? "Online" : "Offline"}`,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (authState === "guest") {
              router.push("/(stack)/auth");
              return;
            }
            router.push("/(stack)/profile-setup");
          },
          showArrow: true,
        },
        {
          icon: "diamond-outline",
          label: isPremium ? "Premium Active" : "Upgrade to Premium",
          subtitle: isPremium
            ? `Analytics + Sync + Export unlocked (${source})`
            : "Unlock analytics, sync, export, backup",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(stack)/paywall");
          },
          showArrow: true,
        },
        ...(isPremium
          ? [
              {
                icon: "sync-outline" as const,
                label: "Sync Now",
                subtitle:
                  syncStatus === "error" && syncError
                    ? `Sync error: ${syncError}`
                    : lastSyncAt
                    ? `Last sync: ${new Date(lastSyncAt).toLocaleString()} • Unsynced: ${unsyncedChanges}`
                    : `Unsynced changes: ${unsyncedChanges}`,
                onPress: async () => {
                  if (authState === "guest") {
                    router.push("/(stack)/auth");
                    return;
                  }
                  try {
                    await syncNow();
                    Alert.alert("Sync Complete", "Your data is synced.");
                  } catch (error) {
                    Alert.alert(
                      "Sync Failed",
                      error instanceof Error ? error.message : "Unable to sync data",
                    );
                  }
                },
                showArrow: true,
              },
              {
                icon: "git-merge-outline" as const,
                label: "Sync Strategy Setup",
                subtitle: "Choose merge/local/cloud behavior and review conflicts",
                onPress: () => {
                  if (authState === "guest") {
                    router.push("/(stack)/auth");
                    return;
                  }
                  router.push("/(stack)/sync-setup");
                },
                showArrow: true,
              },
            ]
          : [
              {
                icon: "lock-closed-outline" as const,
                label: "Cloud Sync Locked",
                subtitle: "Subscribe to Premium to enable sync across devices",
                onPress: () => router.push("/(stack)/paywall"),
                showArrow: true,
              },
            ]),
        {
          icon: "refresh-outline",
          label: "Restore Purchases",
          subtitle: "Recover your purchases",
          onPress: async () => {
            try {
              const result = await restorePurchases();
              if (result.restoredPremium) {
                Alert.alert("Restore Complete", "Premium purchase restored successfully.");
              } else {
                Alert.alert(
                  "No Purchases Found",
                  authState === "guest"
                    ? "No active premium purchases were found for this guest session. If you purchased on another device, sign in with the same account and try restore again."
                    : "No active premium purchases were found for this account.",
                );
              }
            } catch (error) {
              Alert.alert(
                "Restore Failed",
                error instanceof Error
                  ? error.message
                  : "Unable to restore purchases",
              );
            }
          },
          showArrow: true,
        },
        {
          icon: "card-outline",
          label: "Manage Subscription",
          subtitle: "Manage billing in app store",
          onPress: async () => {
            try {
              await billingService.openManageSubscriptionPortal();
            } catch (error) {
              Alert.alert(
                "Manage Subscription",
                error instanceof Error
                  ? error.message
                  : "Unable to open store subscription settings.",
              );
            }
          },
          showArrow: true,
        },
        ...(authState !== "guest"
          ? [
              {
                icon: "log-out-outline" as const,
                label: "Sign Out",
                subtitle: "Switch back to guest mode",
                onPress: async () => {
                  try {
                    await signOut();
                    Alert.alert("Signed Out", "You are now using guest mode.");
                  } catch (error) {
                    Alert.alert(
                      "Sign Out Failed",
                      error instanceof Error
                        ? error.message
                        : "Unable to sign out",
                    );
                  }
                },
                showArrow: true,
              },
            ]
          : []),
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "repeat-outline",
          label: "Subscription Processing",
          subtitle:
            SUBSCRIPTION_MODE_LABELS[settings.subscriptionProcessingMode],
          onPress: handleSubscriptionModeChange,
          showArrow: true,
        },
        {
          icon: "moon-outline",
          label: "Appearance",
          subtitle:
            theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light",
          onPress: handleThemeChange,
          showArrow: true,
        },
        {
          icon: "cash-outline",
          label: "Default Currency",
          subtitle: currentCurrency
            ? `${currentCurrency.code} (${currentCurrency.symbolNative})`
            : "USD ($)",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCurrencyDropdown((prev) => !prev);
          },
          showArrow: true,
        },
      ],
    },
    {
      title: "Data",
      items: [
        {
          icon: "cloud-upload-outline",
          label: "Export Data",
          subtitle: "Download your data as JSON",
          onPress: () =>
            Alert.alert(
              "Export Data",
              "This will export all your financial data to a JSON file.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Export",
                  onPress: async () => {
                    if (!isPremium) {
                      Alert.alert(
                        "Premium Required",
                        "Data export is available in Premium.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "View Plans",
                            onPress: () => router.push("/(stack)/paywall"),
                          },
                        ],
                      );
                      return;
                    }
                    try {
                      await exportAllData();
                    } catch (error) {
                      Alert.alert(
                        "Export Failed",
                        error instanceof Error
                          ? error.message
                          : "An error occurred while exporting data.",
                      );
                    }
                  },
                },
              ],
            ),
          showArrow: true,
        },
        {
          icon: "trash-outline",
          label: "Clear All Data",
          subtitle: "Delete all app data from this device",
          onPress: () =>
            Alert.alert(
              "Clear All Data",
              "This will permanently delete all your accounts, transactions, budgets, goals, and categories. This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Clear Data",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAllData();
                      await Promise.all([
                        refreshAccounts(),
                        refreshTransactions(),
                        refreshBudgets(),
                        refreshGoals(),
                        refreshCategories(),
                        refreshSubscriptions(),
                        refreshUserProfile(),
                      ]);
                      Alert.alert(
                        "Data Deleted",
                        "All app data has been deleted successfully.",
                      );
                    } catch (error) {
                      Alert.alert(
                        "Delete Failed",
                        error instanceof Error
                          ? error.message
                          : "Failed to delete all data.",
                      );
                    }
                  },
                },
              ],
            ),
          showArrow: true,
        },
      ],
    },
    ...(__DEV__
      ? [
          {
            title: "Debug Tools",
            items: [
              {
                icon: "flask-outline" as const,
                label: "Generate Large Test Data",
                subtitle: "Seed many records locally for sync stress testing",
                onPress: () =>
                  Alert.alert(
                    "Generate Test Data",
                    "This will insert a large synthetic dataset into local storage for sync testing.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Generate",
                        onPress: async () => {
                          try {
                            const result = await generateLargeDebugData({
                              userId: authState === "guest" ? null : userId || null,
                              scale: "large",
                            });
                            await Promise.all([
                              refreshAccounts(),
                              refreshTransactions(),
                              refreshBudgets(),
                              refreshGoals(),
                              refreshCategories(),
                              refreshSubscriptions(),
                            ]);
                            Alert.alert(
                              "Debug Data Ready",
                              `Inserted ${result.transactions} transactions, ${result.accounts} accounts, ${result.categories} categories, ${result.budgets} budgets, ${result.monthlyBudgets} monthly budgets, ${result.goals} goals, ${result.subscriptions} subscriptions.`,
                            );
                          } catch (error) {
                            Alert.alert(
                              "Seed Failed",
                              error instanceof Error
                                ? error.message
                                : "Unable to generate debug data.",
                            );
                          }
                        },
                      },
                    ],
                  ),
                showArrow: true,
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <Text style={styles.profileName}>
            {userName || "Budget Tracker User"}
          </Text>
          <Text style={styles.profileEmail}>{profileSubtitle}</Text>

          <View style={styles.profileStats}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{accounts.length}</Text>
              <Text style={styles.profileStatLabel}>Accounts</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{transactions.length}</Text>
              <Text style={styles.profileStatLabel}>Transactions</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{goals.length}</Text>
              <Text style={styles.profileStatLabel}>Goals</Text>
            </View>
          </View>
        </Card>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 &&
                      styles.menuItemBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemIcon}>
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={styles.menuItemSubtitle}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  {item.badge !== undefined && Number(item.badge) > 0 && (
                    <View style={styles.menuItemBadge}>
                      <Text style={styles.menuItemBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  {item.showArrow && (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textMuted}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Cents and Sense v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Made with care for better finances
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Inline Currency Dropdown */}
      {showCurrencyDropdown && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.xl,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <CurrencyDropdown
            selectedCode={defaultCurrencyCode}
            onSelect={async (code) => {
              await Promise.all([
                setDefaultCurrency(code),
                updateDefaultCurrency(code),
              ]);
              setShowCurrencyDropdown(false);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }}
            label="Select Default Currency"
          />
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    backButton: {
      padding: spacing.xs,
      marginRight: spacing.sm,
    },
    headerSpacer: {
      width: 36,
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
    },
    profileCard: {
      alignItems: "center",
      paddingVertical: spacing.xl,
      marginBottom: spacing.lg,
    },
    profileAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primaryLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    profileName: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    profileStats: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-around",
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    profileStatItem: {
      alignItems: "center",
    },
    profileStatValue: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.primary,
    },
    profileStatLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    profileStatDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    menuCard: {
      padding: 0,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    menuItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.surfaceSecondary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    menuItemContent: {
      flex: 1,
    },
    menuItemLabel: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    menuItemSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    menuItemBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      marginRight: spacing.sm,
    },
    menuItemBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textInverse,
    },
    footer: {
      alignItems: "center",
      paddingVertical: spacing.xl,
    },
    footerText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    footerSubtext: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
  });
