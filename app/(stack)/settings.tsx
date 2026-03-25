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
} from "../../lib/theme";
import { Card } from "../../lib/components";
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
import { billingService } from "../../lib/services/BillingService";
import { CurrencyDropdown } from "../../lib/components/CurrencyPicker";
import { exportAllData, deleteAllData } from "../../lib/utils/dataManagement";
import { useMemo, useState } from "react";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string | number;
  showArrow?: boolean;
  color?: string;
}

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
  const { authState, email, signOut } = useAuth();
  const { isPremium, source, purchasePlan, restorePurchases } = useEntitlements();
  const { syncNow, backupNow, restoreFromCloud, syncStatus, lastSyncAt } =
    useSync();

  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // Get app version
  const appVersion = Application.nativeApplicationVersion || "1.0.0";
  const buildNumber = Application.nativeBuildVersion || "1";

  // Calculate some stats for display
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeGoals = goals.filter(
    (g) => g.currentAmount < g.targetAmount,
  ).length;
  const activeBudgets = budgets.length;

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Finance Management",
      items: [
        {
          icon: "wallet-outline",
          label: "Accounts",
          subtitle: `${accounts.length} accounts • ${formatCurrency(totalBalance, defaultCurrency)}`,
          onPress: () => router.push("/(stack)/accounts"),
          badge: accounts.length,
          showArrow: true,
          color: "#4CAF50",
        },
        {
          icon: "pie-chart-outline",
          label: "Budgets",
          subtitle: `${activeBudgets} active budgets`,
          onPress: () => router.push("/(stack)/budgets"),
          badge: activeBudgets,
          showArrow: true,
          color: "#2196F3",
        },
        {
          icon: "flag-outline",
          label: "Goals",
          subtitle: `${activeGoals} in progress`,
          onPress: () => router.push("/(stack)/goals"),
          badge: activeGoals,
          showArrow: true,
          color: "#FF9800",
        },
        {
          icon: "pricetags-outline",
          label: "Categories",
          subtitle: `${categories.length} categories`,
          onPress: () => router.push("/(stack)/categories"),
          showArrow: true,
          color: "#9C27B0",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "notifications-outline",
          label: "Notifications",
          subtitle: "Coming soon",
          onPress: () =>
            Alert.alert(
              "Notifications",
              "Push notifications will be available in a future update.",
            ),
          showArrow: true,
        },
        {
          icon: "cash-outline",
          label: "Default Currency",
          subtitle: `${defaultCurrency} - Tap to change`,
          onPress: () => setShowCurrencyDropdown((prev) => !prev),
          showArrow: true,
        },
        {
          icon: "moon-outline",
          label: "Appearance",
          subtitle:
            theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light",
          onPress: () =>
            Alert.alert("Appearance", "Choose your theme", [
              {
                text: "System",
                onPress: () => setTheme("system" as ThemeMode),
              },
              {
                text: "Light",
                onPress: () => setTheme("light" as ThemeMode),
              },
              {
                text: "Dark",
                onPress: () => setTheme("dark" as ThemeMode),
              },
              { text: "Cancel", style: "cancel" },
            ]),
          showArrow: true,
        },
      ],
    },
    {
      title: "Data & Security",
      items: [
        {
          icon: "download-outline",
          label: "Export All Data",
          subtitle: "Download your data as JSON file",
          onPress: async () => {
            if (!isPremium) {
              Alert.alert(
                "Premium Required",
                "Data export is part of Premium. Upgrade to unlock export and cloud backup.",
              );
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
          color: "#4CAF50",
        },
        {
          icon: "trash-outline",
          label: "Delete All Data",
          subtitle: "Permanently delete everything",
          onPress: () =>
            Alert.alert(
              "⚠️ Delete All Data",
              "This will PERMANENTLY delete:\n\n• All accounts\n• All transactions\n• All budgets\n• All goals\n• All subscriptions\n• All custom categories\n• All settings\n\nThis action CANNOT be undone!\n\nConsider exporting your data first.",
              [
                { text: "Cancel", style: "cancel" },
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
                {
                  text: "Delete Everything",
                  style: "destructive",
                  onPress: () => {
                    // Double confirmation
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
                              // Refresh all contexts
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
                                "✅ Data Deleted",
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
      ],
    },
    {
      title: "Cloud Sync",
      items: [
        {
          icon: "cloud-outline",
          label: "Account",
          subtitle:
            authState !== "guest"
              ? `Signed in${email ? ` as ${email}` : ""}`
              : "Guest mode (not syncing)",
          onPress: () =>
            authState !== "guest"
              ? Alert.alert("Account", "You are signed in.")
              : router.push("/(stack)/auth"),
          showArrow: authState === "guest",
        },
        {
          icon: "sync-outline",
          label: "Sync Now",
          subtitle:
            lastSyncAt && syncStatus !== "error"
              ? `Last sync: ${new Date(lastSyncAt).toLocaleString()}`
              : "Push & pull latest changes",
          onPress: async () => {
            if (!isPremium) {
              Alert.alert("Premium Required", "Cloud sync requires Premium.");
              return;
            }
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
          icon: "cloud-upload-outline",
          label: "Backup to Cloud",
          subtitle: "Upload latest device data",
          onPress: async () => {
            if (!isPremium) {
              Alert.alert("Premium Required", "Cloud backup requires Premium.");
              return;
            }
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
          icon: "cloud-download-outline",
          label: "Restore from Cloud",
          subtitle: "Pull latest cloud snapshot",
          onPress: async () => {
            if (!isPremium) {
              Alert.alert("Premium Required", "Cloud restore requires Premium.");
              return;
            }
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
      ],
    },
    {
      title: "Premium",
      items: [
        {
          icon: "diamond-outline",
          label: isPremium ? "Premium Active" : "Upgrade to Premium",
          subtitle: isPremium
            ? `Analytics, sync, export, and backup unlocked (${source})`
            : "Unlock analytics + sync + export + cloud backup",
          onPress: () => {
            if (isPremium) {
              Alert.alert("Premium", "Your premium access is active.");
              return;
            }
            Alert.alert("Choose Plan", "Select a plan to continue", [
              {
                text: "Monthly",
                onPress: async () => {
                  try {
                    await purchasePlan("monthly");
                  } catch (error) {
                    Alert.alert(
                      "Purchase Failed",
                      error instanceof Error
                        ? error.message
                        : "Unable to complete purchase",
                    );
                  }
                },
              },
              {
                text: "Yearly",
                onPress: async () => {
                  try {
                    await purchasePlan("yearly");
                  } catch (error) {
                    Alert.alert(
                      "Purchase Failed",
                      error instanceof Error
                        ? error.message
                        : "Unable to complete purchase",
                    );
                  }
                },
              },
              {
                text: "Lifetime",
                onPress: async () => {
                  try {
                    await purchasePlan("lifetime");
                  } catch (error) {
                    Alert.alert(
                      "Purchase Failed",
                      error instanceof Error
                        ? error.message
                        : "Unable to complete purchase",
                    );
                  }
                },
              },
              { text: "Cancel", style: "cancel" },
            ]);
          },
          showArrow: true,
        },
        {
          icon: "refresh-outline",
          label: "Restore Purchases",
          subtitle: "Recover purchases on this device",
          onPress: async () => {
            try {
              await restorePurchases();
              Alert.alert("Restore Complete", "Purchases were restored.");
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
        {
          icon: "log-out-outline",
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
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "book-outline",
          label: "User Guide",
          subtitle: "How to use Cents and Sense",
          onPress: () => router.push("/(stack)/guide"),
          showArrow: true,
        },
        {
          icon: "help-circle-outline",
          label: "Help & FAQ",
          subtitle: "Get help on GitHub",
          onPress: () => {
            const url =
              "https://github.com/waqarilyas/budget-tracker-app-development/discussions";
            Linking.openURL(url).catch(() =>
              Alert.alert("Error", "Could not open the link."),
            );
          },
          showArrow: true,
        },
        {
          icon: "bug-outline",
          label: "Report a Bug",
          subtitle: "Help us improve",
          onPress: () => {
            const url =
              "https://github.com/waqarilyas/budget-tracker-app-development/issues/new?template=bug_report.md";
            Linking.openURL(url).catch(() =>
              Alert.alert("Error", "Could not open the link."),
            );
          },
          showArrow: true,
        },
        {
          icon: "star-outline",
          label: "Feature Request",
          subtitle: "Suggest new features",
          onPress: () => {
            const url =
              "https://github.com/waqarilyas/budget-tracker-app-development/issues/new?template=feature_request.md";
            Linking.openURL(url).catch(() =>
              Alert.alert("Error", "Could not open the link."),
            );
          },
          showArrow: true,
        },
        {
          icon: "heart-outline",
          label: "Rate on App Store",
          subtitle: "Support the project",
          onPress: () =>
            Alert.alert(
              "Thank You!",
              "We appreciate your support! The app will be available on app stores soon.",
            ),
          showArrow: true,
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: "information-circle-outline",
          label: "App Version",
          subtitle: `Version ${appVersion} (Build ${buildNumber})`,
          onPress: () => {
            Alert.alert(
              "Cents and Sense",
              `Version: ${appVersion}\nBuild: ${buildNumber}\n\nA comprehensive budget tracking app built with React Native and Expo.\n\nMade with ❤️ by the open-source community.`,
            );
          },
        },
        {
          icon: "shield-checkmark-outline",
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
          icon: "document-text-outline",
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
          icon: "code-slash-outline",
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
          color: "#4CAF50",
        },
        {
          icon: "people-outline",
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
          icon: "heart-outline",
          label: "Acknowledgments",
          subtitle: "Built with amazing tools",
          onPress: () => {
            Alert.alert(
              "Acknowledgments",
              "Cents and Sense is built with:\n\n• React Native & Expo\n• React Native Paper\n• SQLite\n• Victory Charts\n• Lucide Icons\n\nAnd many other amazing open-source libraries.\n\nThank you to all the developers!",
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
              <View style={[styles.statIcon, { backgroundColor: "#E8F5E9" }]}>
                <Ionicons name="wallet" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.statValue}>
                ${totalBalance.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Balance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: "#E3F2FD" }]}>
                <Ionicons name="swap-vertical" size={20} color="#2196F3" />
              </View>
              <Text style={styles.statValue}>{transactions.length}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: "#FFF3E0" }]}>
                <Ionicons name="flag" size={20} color="#FF9800" />
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
                      item.color && { backgroundColor: `${item.color}15` },
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
  });
