import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import {
  useThemeColors,
  ThemeMode,
  ThemeColors,
  spacing,
  borderRadius,
  formatCurrency,
  formatReadableCurrency,
} from "../../lib/theme";
import { BottomSheet, Card } from "../../lib/components";
import { useAccounts } from "../../lib/contexts/AccountContext";
import { useGoals } from "../../lib/contexts/GoalContext";
import { useBudgets } from "../../lib/contexts/BudgetContext";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useSubscriptions } from "../../lib/contexts/SubscriptionContext";
import { useUser } from "../../lib/contexts/UserContext";
import { useCurrency } from "../../lib/contexts/CurrencyContext";
import { useAuth } from "../../lib/contexts/AuthContext";
import { useEntitlements } from "../../lib/contexts/EntitlementContext";
import { useSync } from "../../lib/contexts/SyncContext";
import { useFeatureFlags } from "../../lib/contexts/FeatureFlagsContext";
import { billingService } from "../../lib/services/BillingService";
import { CurrencyDropdown } from "../../lib/components/CurrencyPicker";
import {
  exportAllData,
  deleteAllData,
  generateLargeDebugData,
} from "../../lib/utils/dataManagement";
import { useMemo, useState } from "react";
import {
  useSettings,
  SubscriptionProcessingMode,
} from "../../lib/contexts/SettingsContext";
import {
  ACCENT_THEME_OPTIONS,
  ACCENT_THEME_MAP,
  AccentThemeId,
} from "../../lib/accentThemes";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string | number;
  showArrow?: boolean;
  color?: string;
}

const SUBSCRIPTION_MODE_LABELS: Record<SubscriptionProcessingMode, string> = {
  auto: "Auto-add to expenses",
  notify: "Ask before adding",
  manual: "Manual only",
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, theme, setTheme } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { accounts, refreshAccounts } = useAccounts();
  const { goals, refreshGoals } = useGoals();
  const { budgets, refreshBudgets } = useBudgets();
  const { transactions, refreshTransactions } = useTransactions();
  const { categories, refreshCategories } = useCategories();
  const { subscriptions, refreshSubscriptions } = useSubscriptions();
  const { userName, defaultCurrency, updateDefaultCurrency, refreshUserProfile } =
    useUser();
  const { setDefaultCurrency } = useCurrency();
  const { authState, email, userId, signOut } = useAuth();
  const { isPremium, source, restorePurchases } = useEntitlements();
  const { flags } = useFeatureFlags();
  const { settings, updateSetting } = useSettings();
  const {
    syncNow,
    backupNow,
    restoreFromCloud,
    syncStatus,
    lastSyncAt,
    syncError,
    isOnline,
    unsyncedChanges,
  } =
    useSync();

  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showAppearanceSheet, setShowAppearanceSheet] = useState(false);

  const openExternalLink = async (
    url: string,
    fallbackTitle: string,
    fallbackMessage: string,
  ) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(fallbackTitle, fallbackMessage);
    }
  };

  // Get app version
  const appVersion = Application.nativeApplicationVersion || "1.0.0";
  const buildNumber = Application.nativeBuildVersion || "1";

  // Calculate some stats for display
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeGoals = goals.filter(
    (g) => g.currentAmount < g.targetAmount,
  ).length;
  const activeBudgets = budgets.length;
  const showExport = flags.exportEnabled;
  const showCloudSync = flags.authEnabled || flags.syncEnabled;
  const showPremiumSection =
    flags.premiumEnabled || flags.paywallEnabled || flags.restorePurchasesEnabled;
  const requirePremiumForExport = flags.premiumEnabled && !isPremium;
  const cloudSyncItems: MenuItem[] = showCloudSync
    ? [
        {
          icon: "cloud",
          label: "Account",
          subtitle:
            authState !== "guest"
              ? `Signed in${email ? ` as ${email}` : ""} • ${isPremium ? `Premium (${source})` : "Free"} • ${isOnline ? "Online" : "Offline"}`
              : `Guest mode (not syncing) • ${isOnline ? "Online" : "Offline"}`,
          onPress: () =>
            authState !== "guest"
              ? router.push("/(stack)/profile-setup")
              : router.push("/(stack)/auth"),
          showArrow: true,
        },
        ...(isPremium
          ? [
              {
                icon: "sync" as const,
                label: "Sync Now",
                subtitle:
                  syncStatus === "error" && syncError
                    ? `Sync error: ${syncError}`
                    : lastSyncAt && syncStatus !== "error"
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
                icon: "git-merge" as const,
                label: "Sync Strategy Setup",
                subtitle: "Review merge/local/cloud strategy and conflict summary",
                onPress: () => {
                  if (authState === "guest") {
                    router.push("/(stack)/auth");
                    return;
                  }
                  router.push("/(stack)/sync-setup");
                },
                showArrow: true,
              },
              {
                icon: "cloud-upload" as const,
                label: "Backup to Cloud",
                subtitle: "Upload latest device data",
                onPress: async () => {
                  if (authState === "guest") {
                    router.push("/(stack)/auth");
                    return;
                  }
                  try {
                    await backupNow();
                    Alert.alert("Backup Complete", "Cloud backup finished.");
                  } catch (error) {
                    Alert.alert(
                      "Backup Failed",
                      error instanceof Error
                        ? error.message
                        : "Unable to back up data",
                    );
                  }
                },
                showArrow: true,
              },
              {
                icon: "cloud-download" as const,
                label: "Restore from Cloud",
                subtitle: "Pull latest cloud snapshot",
                onPress: async () => {
                  if (authState === "guest") {
                    router.push("/(stack)/auth");
                    return;
                  }
                  try {
                    await restoreFromCloud();
                    await Promise.all([
                      refreshAccounts(),
                      refreshTransactions(),
                      refreshBudgets(),
                      refreshGoals(),
                      refreshCategories(),
                      refreshSubscriptions(),
                      refreshUserProfile(),
                    ]);
                    Alert.alert("Restore Complete", "Cloud data restored.");
                  } catch (error) {
                    Alert.alert(
                      "Restore Failed",
                      error instanceof Error
                        ? error.message
                        : "Unable to restore data",
                    );
                  }
                },
                showArrow: true,
              },
            ]
          : flags.paywallEnabled
            ? [
                {
                  icon: "lock-closed" as const,
                  label: "Cloud Sync Locked",
                  subtitle: "Subscribe to Premium to enable sync and cloud backup",
                  onPress: () => router.push("/(stack)/paywall"),
                  showArrow: true,
                },
              ]
            : []),
      ]
    : [];
  const premiumItems: MenuItem[] = showPremiumSection
    ? [
        ...(flags.paywallEnabled
          ? [
              {
                icon: "diamond" as const,
                label: isPremium ? "Premium Active" : "Upgrade to Premium",
                subtitle: isPremium
                  ? `Analytics, sync, export, and backup unlocked (${source})`
                  : "Unlock analytics + sync + export + cloud backup",
                onPress: () => router.push("/(stack)/paywall"),
                showArrow: true,
              },
            ]
          : []),
        ...(flags.restorePurchasesEnabled
          ? [
              {
                icon: "refresh" as const,
                label: "Restore Purchases",
                subtitle: "Recover purchases on this device",
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
            ]
          : []),
        ...(flags.premiumEnabled
          ? [
              {
                icon: "card" as const,
                label: "Manage Subscription",
                subtitle: "Open store subscription settings",
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
            ]
          : []),
        ...(authState !== "guest"
          ? [
              {
                icon: "log-out" as const,
                label: "Sign Out",
                subtitle: "Stay on this device as guest",
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
      ]
    : [];

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Finance Management",
      items: [
        {
          icon: "wallet",
          label: "Accounts",
          subtitle: `${accounts.length} accounts • ${formatReadableCurrency(totalBalance, defaultCurrency)}`,
          onPress: () => router.push("/(stack)/accounts"),
          badge: accounts.length,
          showArrow: true,
        },
        {
          icon: "pie-chart",
          label: "Budgets",
          subtitle: `${activeBudgets} active budgets`,
          onPress: () => router.push("/(stack)/budgets"),
          badge: activeBudgets,
          showArrow: true,
        },
        {
          icon: "flag",
          label: "Goals",
          subtitle: `${activeGoals} in progress`,
          onPress: () => router.push("/(stack)/goals"),
          badge: activeGoals,
          showArrow: true,
        },
        {
          icon: "pricetags",
          label: "Categories",
          subtitle: `${categories.length} categories`,
          onPress: () => router.push("/(stack)/categories"),
          showArrow: true,
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "repeat",
          label: "Subscription Processing",
          subtitle:
            SUBSCRIPTION_MODE_LABELS[settings.subscriptionProcessingMode],
          onPress: () =>
            Alert.alert(
              "Subscription Processing",
              "Choose how subscriptions are added when they become due:",
              [
                {
                  text: "Auto-add",
                  onPress: () =>
                    updateSetting("subscriptionProcessingMode", "auto"),
                },
                {
                  text: "Ask Me First",
                  onPress: () =>
                    updateSetting("subscriptionProcessingMode", "notify"),
                },
                {
                  text: "Manual Only",
                  onPress: () =>
                    updateSetting("subscriptionProcessingMode", "manual"),
                },
                { text: "Cancel", style: "cancel" },
              ],
            ),
          showArrow: true,
        },
        {
          icon: "cash",
          label: "Default Currency",
          subtitle: `${defaultCurrency} - Tap to change`,
          onPress: () => setShowCurrencyDropdown((prev) => !prev),
          showArrow: true,
        },
        {
          icon: "moon",
          label: "Appearance",
          subtitle:
            `${theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"} • ${ACCENT_THEME_MAP[settings.accentTheme].label}`,
          onPress: () => {
            setShowCurrencyDropdown(false);
            setShowAppearanceSheet(true);
          },
          showArrow: true,
        },
      ],
    },
    {
      title: "Data & Security",
      items: [
        ...(showExport
          ? [
              {
                icon: "download" as const,
                label: "Export All Data",
                subtitle: "Download your data as JSON file",
                onPress: async () => {
                  if (requirePremiumForExport) {
                    if (flags.paywallEnabled) {
                      Alert.alert(
                        "Premium Required",
                        "Data export is part of Premium. Upgrade to unlock export and cloud backup.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "View Plans",
                            onPress: () => router.push("/(stack)/paywall"),
                          },
                        ],
                      );
                    } else {
                      Alert.alert(
                        "Export Unavailable",
                        "Data export is not available in this release.",
                      );
                    }
                    return;
                  }
                  Alert.alert(
                    "Export Data",
                    "This will export all your financial data (accounts, transactions, budgets, goals, etc.) to a JSON file.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Export",
                        onPress: async () => {
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
                  );
                },
                showArrow: true,
              },
            ]
          : []),
        {
          icon: "trash",
          label: "Delete All Data",
          subtitle: "Permanently delete everything",
          onPress: () =>
            Alert.alert(
              "Delete All Data",
              `This will permanently delete:\n\nAccounts\nTransactions\nBudgets\nGoals\nSubscriptions\nCustom categories\nSettings\n\nThis action cannot be undone.${showExport ? "\n\nConsider exporting your data first." : ""}`,
              [
                { text: "Cancel", style: "cancel" },
                ...(showExport
                  ? [
                      {
                        text: "Export First",
                        onPress: async () => {
                          try {
                            await exportAllData();
                            Alert.alert(
                              "Data Exported",
                              "Now you can safely delete your data if needed.",
                            );
                          } catch (error) {
                            Alert.alert(
                              "Export Failed",
                              "Please try exporting again before deleting data.",
                            );
                          }
                        },
                      },
                    ]
                  : []),
                {
                  text: "Delete Everything",
                  style: "destructive",
                  onPress: () => {
                    Alert.alert(
                      "Final Confirmation",
                      "Are you absolutely sure? This will delete ALL your data permanently.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Yes, Delete All",
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
                                "All your data has been permanently deleted. You can start fresh or close the app.",
                              );
                            } catch (error) {
                              Alert.alert(
                                "Error",
                                error instanceof Error
                                  ? error.message
                                  : "Failed to delete data. Please try again.",
                              );
                            }
                          },
                        },
                      ],
                    );
                  },
                },
              ],
            ),
          color: "#F44336",
          showArrow: true,
        },
        ...(__DEV__
          ? [
              {
                icon: "flask" as const,
                label: "Generate Large Test Data",
                subtitle: "Debug: seed thousands of records for sync testing",
                onPress: () =>
                  Alert.alert(
                    "Generate Debug Data",
                    "This will insert a large synthetic dataset into local storage for sync stress testing.",
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
                              error instanceof Error ? error.message : "Unable to generate debug data.",
                            );
                          }
                        },
                      },
                    ],
                  ),
                showArrow: true,
              },
            ]
          : []),
      ],
    },
    ...(showCloudSync && cloudSyncItems.length
      ? [{ title: "Cloud Sync", items: cloudSyncItems }]
      : []),
    ...(showPremiumSection && premiumItems.length
      ? [{ title: "Premium", items: premiumItems }]
      : []),
    {
      title: "Support",
      items: [
        {
          icon: "book",
          label: "User Guide",
          subtitle: "How to use Cents and Sense",
          onPress: () => router.push("/(stack)/guide"),
          showArrow: true,
        },
        {
          icon: "help-circle-outline",
          label: "Help & FAQ",
          subtitle: "Get help on GitHub",
          onPress: () =>
            openExternalLink(
              "https://github.com/waqarilyas/budget-tracker-app-development/discussions",
              "Help & FAQ",
              "Could not open GitHub discussions.",
            ),
          showArrow: true,
        },
        {
          icon: "bug",
          label: "Report a Bug",
          subtitle: "Help us improve",
          onPress: () =>
            openExternalLink(
              "https://github.com/waqarilyas/budget-tracker-app-development/issues/new?template=bug_report.md",
              "Report a Bug",
              "Could not open the bug report form.",
            ),
          showArrow: true,
        },
        {
          icon: "star",
          label: "Feature Request",
          subtitle: "Suggest new features",
          onPress: () =>
            openExternalLink(
              "https://github.com/waqarilyas/budget-tracker-app-development/issues/new?template=feature_request.md",
              "Feature Request",
              "Could not open the feature request form.",
            ),
          showArrow: true,
        },
        {
          icon: "heart",
          label: "Star on GitHub",
          subtitle: "Support the project",
          onPress: () =>
            openExternalLink(
              "https://github.com/waqarilyas/budget-tracker-app-development/stargazers",
              "Star on GitHub",
              "Could not open the GitHub page.",
            ),
          showArrow: true,
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: "information-circle",
          label: "App Version",
          subtitle: `Version ${appVersion} (Build ${buildNumber})`,
          onPress: () => {
            Alert.alert(
              "Cents and Sense",
              `Version: ${appVersion}\nBuild: ${buildNumber}\n\nA comprehensive budget tracking app built with React Native and Expo.\n\nBuilt by the open-source community.`,
            );
          },
        },
        {
          icon: "shield-checkmark",
          label: "Privacy Policy",
          subtitle: "How we protect your data",
          onPress: () => {
            const url =
              "https://github.com/waqarilyas/budget-tracker-app-development/blob/main/PRIVACY_POLICY.md";
            Linking.openURL(url).catch(() =>
              Alert.alert(
                "Privacy Policy",
                "Your data is stored locally on your device only. We do not collect, transmit, or store any of your personal or financial information on external servers. You have complete control over your data at all times.",
              ),
            );
          },
          showArrow: true,
        },
        {
          icon: "document-text",
          label: "Terms of Service",
          subtitle: "Terms and conditions",
          onPress: () => {
            const url =
              "https://github.com/waqarilyas/budget-tracker-app-development/blob/main/TERMS_OF_SERVICE.md";
            Linking.openURL(url).catch(() =>
              Alert.alert(
                "Terms of Service",
                "Cents and Sense is provided as-is under the MIT License. By using this app, you agree to use it responsibly for personal finance tracking.",
              ),
            );
          },
          showArrow: true,
        },
        {
          icon: "code-slash",
          label: "Open Source",
          subtitle: "MIT License - View on GitHub",
          onPress: () => {
            const url =
              "https://github.com/waqarilyas/budget-tracker-app-development";
            Linking.openURL(url).catch(() =>
              Alert.alert("Error", "Could not open GitHub repository."),
            );
          },
          showArrow: true,
        },
        {
          icon: "people",
          label: "Contributors",
          subtitle: "Meet the team",
          onPress: () => {
            const url =
              "https://github.com/waqarilyas/budget-tracker-app-development/graphs/contributors";
            Linking.openURL(url).catch(() =>
              Alert.alert(
                "Contributors",
                "Thank you to all our contributors who make this project possible!",
              ),
            );
          },
          showArrow: true,
        },
        {
          icon: "heart",
          label: "Acknowledgments",
          subtitle: "Built with amazing tools",
          onPress: () => {
            Alert.alert(
              "Acknowledgments",
              "Cents and Sense is built with:\n\nReact Native and Expo\nReact Native Paper\nSQLite\nVictory Charts\nIonicons\n\nAnd many other open-source libraries.\n\nThank you to all the developers who made it possible.",
            );
          },
          showArrow: true,
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Settings</Text>
          {userName && (
            <Text style={styles.headerSubtitle}>Hello, {userName}!</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons name="wallet" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>
                {formatReadableCurrency(totalBalance, defaultCurrency)}
              </Text>
              <Text style={styles.statLabel}>Total Balance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons
                  name="swap-vertical"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.statValue}>{transactions.length}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons name="flag" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{activeGoals}</Text>
              <Text style={styles.statLabel}>Active Goals</Text>
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
                  <View
                    style={[
                      styles.menuIconContainer,
                      item.color
                        ? { backgroundColor: `${item.color}15` }
                        : { backgroundColor: colors.surfaceSecondary },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={item.color || colors.primary}
                    />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text
                      style={[
                        styles.menuItemLabel,
                        item.color === "#F44336" && { color: "#F44336" },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.subtitle && (
                      <Text style={styles.menuItemSubtitle}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  {item.badge !== undefined && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  {item.showArrow && (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textSecondary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* Bottom Spacing for Tab Bar */}
        <View style={{ height: 120 }} />
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
            selectedCode={defaultCurrency}
            onSelect={async (code) => {
              await Promise.all([
                updateDefaultCurrency(code),
                setDefaultCurrency(code),
              ]);
              setShowCurrencyDropdown(false);
            }}
            label="Select Default Currency"
          />
        </View>
      )}

      <BottomSheet
        visible={showAppearanceSheet}
        onClose={() => setShowAppearanceSheet(false)}
        title="Appearance"
      >
        <Text style={styles.appearanceSectionTitle}>Theme Mode</Text>
        <View style={styles.themeModeRow}>
          {(["system", "light", "dark"] as ThemeMode[]).map((option) => {
            const active = theme === option;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.themeModeButton,
                  active && styles.themeModeButtonActive,
                ]}
                onPress={() => setTheme(option)}
                accessibilityRole="button"
                accessibilityLabel={`Use ${option} theme`}
              >
                <Text
                  style={[
                    styles.themeModeText,
                    active && styles.themeModeTextActive,
                  ]}
                >
                  {option === "system"
                    ? "System"
                    : option === "light"
                      ? "Light"
                      : "Dark"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.appearanceSectionTitle}>Accent Color</Text>
        <Text style={styles.appearanceHint}>
          Accent colors apply across navigation, buttons, chips, highlights, and
          interactive UI.
        </Text>

        <View style={styles.accentGrid}>
          {ACCENT_THEME_OPTIONS.map((option) => {
            const isSelected = settings.accentTheme === option.id;
            const preview = option.light;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.accentCard,
                  isSelected && styles.accentCardSelected,
                ]}
                onPress={() =>
                  updateSetting("accentTheme", option.id as AccentThemeId)
                }
                accessibilityRole="button"
                accessibilityLabel={`Use ${option.label} accent theme`}
              >
                <View style={styles.accentPreviewRow}>
                  <View
                    style={[
                      styles.accentSwatchLarge,
                      { backgroundColor: preview.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.accentSwatchSmall,
                      { backgroundColor: preview.primaryLight },
                    ]}
                  />
                  <View
                    style={[
                      styles.accentSwatchSmall,
                      { backgroundColor: preview.accent },
                    ]}
                  />
                </View>
                <View style={styles.accentMeta}>
                  <Text style={styles.accentLabel}>{option.label}</Text>
                  <Text style={styles.accentDescription}>
                    {option.description}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>
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
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    statsCard: {
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
    },
    statItem: {
      alignItems: "center",
      flex: 1,
    },
    statIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xs,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      height: 50,
      backgroundColor: colors.border,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    menuCard: {
      padding: 0,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    menuItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    menuItemContent: {
      flex: 1,
    },
    menuItemLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    menuItemSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    badge: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 12,
      marginRight: spacing.sm,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    appearanceSectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    appearanceHint: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: spacing.md,
    },
    themeModeRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    themeModeButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    themeModeButtonActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    themeModeText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    themeModeTextActive: {
      color: colors.primary,
    },
    accentGrid: {
      gap: spacing.sm,
    },
    accentCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    accentCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    accentPreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    accentSwatchLarge: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    accentSwatchSmall: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    accentMeta: {
      flex: 1,
    },
    accentLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    accentDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
