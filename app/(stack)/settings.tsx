import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useThemeColors,
  ThemeMode,
  ThemeColors,
  spacing,
  borderRadius,
} from "../../lib/theme";
import { Card } from "../../lib/components";
import { useAccounts } from "../../lib/contexts/AccountContext";
import { useGoals } from "../../lib/contexts/GoalContext";
import { useBudgets } from "../../lib/contexts/BudgetContext";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useUser } from "../../lib/contexts/UserContext";
import { CurrencyPicker } from "../../lib/components/CurrencyPicker";
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

  const { accounts } = useAccounts();
  const { goals } = useGoals();
  const { budgets } = useBudgets();
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { userName, defaultCurrency, updateDefaultCurrency } = useUser();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

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
          subtitle: `${accounts.length} accounts • $${totalBalance.toLocaleString()}`,
          onPress: () => router.push("/accounts"),
          badge: accounts.length,
          showArrow: true,
          color: "#4CAF50",
        },
        {
          icon: "pie-chart-outline",
          label: "Budgets",
          subtitle: `${activeBudgets} active budgets`,
          onPress: () => router.push("/budgets"),
          badge: activeBudgets,
          showArrow: true,
          color: "#2196F3",
        },
        {
          icon: "flag-outline",
          label: "Goals",
          subtitle: `${activeGoals} in progress`,
          onPress: () => router.push("/goals"),
          badge: activeGoals,
          showArrow: true,
          color: "#FF9800",
        },
        {
          icon: "pricetags-outline",
          label: "Categories",
          subtitle: `${categories.length} categories`,
          onPress: () => router.push("/categories"),
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
          subtitle: notificationsEnabled ? "Enabled" : "Disabled",
          onPress: () => setNotificationsEnabled(!notificationsEnabled),
          showArrow: true,
        },
        {
          icon: "cash-outline",
          label: "Default Currency",
          subtitle: `${defaultCurrency} - Tap to change`,
          onPress: () => setShowCurrencyPicker(true),
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
          icon: "cloud-upload-outline",
          label: "Backup Data",
          subtitle: "Export your data",
          onPress: () =>
            Alert.alert("Backup", "Data backup feature coming soon!"),
          showArrow: true,
        },
        {
          icon: "cloud-download-outline",
          label: "Restore Data",
          subtitle: "Import from backup",
          onPress: () =>
            Alert.alert("Restore", "Data restore feature coming soon!"),
          showArrow: true,
        },
        {
          icon: "trash-outline",
          label: "Clear All Data",
          subtitle: "Delete all transactions and accounts",
          onPress: () =>
            Alert.alert(
              "Clear All Data",
              "This will permanently delete all your data. This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => {} },
              ],
            ),
          color: "#F44336",
          showArrow: true,
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "help-circle-outline",
          label: "Help & FAQ",
          onPress: () =>
            Alert.alert("Help", "Visit our website for help and FAQs."),
          showArrow: true,
        },
        {
          icon: "mail-outline",
          label: "Contact Support",
          onPress: () =>
            Alert.alert("Contact", "Email us at support@budgettracker.app"),
          showArrow: true,
        },
        {
          icon: "star-outline",
          label: "Rate App",
          onPress: () =>
            Alert.alert("Thank You!", "We appreciate your feedback!"),
          showArrow: true,
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: "information-circle-outline",
          label: "Version",
          subtitle: "1.0.0",
          onPress: () => {},
        },
        {
          icon: "shield-checkmark-outline",
          label: "Privacy Policy",
          onPress: () =>
            Alert.alert("Privacy", "Your data stays on your device."),
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

      {/* Currency Picker Modal */}
      <CurrencyPicker
        visible={showCurrencyPicker}
        selectedCode={defaultCurrency}
        onSelect={async (currency) => {
          await updateDefaultCurrency(currency.code);
          setShowCurrencyPicker(false);
        }}
        onClose={() => setShowCurrencyPicker(false)}
      />
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
