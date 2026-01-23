import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, formatCurrency } from "../../lib/theme";
import { Card } from "../../lib/components";
import { useAccounts } from "../../lib/contexts/AccountContext";
import { useGoals } from "../../lib/contexts/GoalContext";
import { useBudgets } from "../../lib/contexts/BudgetContext";
import { useTransactions } from "../../lib/contexts/TransactionContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useSubscriptions } from "../../lib/contexts/SubscriptionContext";
import { useState } from "react";
import * as Haptics from "expo-haptics";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string | number;
  showArrow?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { accounts } = useAccounts();
  const { goals } = useGoals();
  const { budgets } = useBudgets();
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { activeSubscriptions, getMonthlyTotal } = useSubscriptions();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  // Calculate some stats for display
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount).length;
  const activeBudgets = budgets.length;
  const monthlySubscriptionCost = getMonthlyTotal();

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Finance Management",
      items: [
        {
          icon: "business-outline",
          label: "Accounts",
          subtitle: `${accounts.length} accounts • Total: $${totalBalance.toFixed(0)}`,
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/accounts"); },
          badge: accounts.length,
          showArrow: true,
        },
        {
          icon: "pie-chart-outline",
          label: "Budgets",
          subtitle: `${activeBudgets} active budgets`,
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/budgets"); },
          badge: activeBudgets,
          showArrow: true,
        },
        {
          icon: "flag-outline",
          label: "Goals",
          subtitle: `${activeGoals} active goals`,
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/goals"); },
          badge: activeGoals,
          showArrow: true,
        },
        {
          icon: "pricetags-outline",
          label: "Categories",
          subtitle: `${categories.length} categories`,
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/categories"); },
          showArrow: true,
        },
        {
          icon: "repeat-outline",
          label: "Subscriptions",
          subtitle: `${activeSubscriptions.length} active • ${formatCurrency(monthlySubscriptionCost)}/mo`,
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/subscriptions"); },
          badge: activeSubscriptions.length,
          showArrow: true,
        },
      ],
    },
    {
      title: "Analytics",
      items: [
        {
          icon: "bar-chart-outline",
          label: "Analytics & Insights",
          subtitle: "Advanced spending trends and reports",
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/analysis"); },
          showArrow: true,
        },
      ],
    },
    {
      title: "Learn",
      items: [
        {
          icon: "book-outline",
          label: "User Guide",
          subtitle: "Learn how to use the app effectively",
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/guide"); },
          showArrow: true,
        },
      ],
    },
    {
      title: "App Settings",
      items: [
        {
          icon: "notifications-outline",
          label: "Notifications",
          subtitle: notificationsEnabled ? "Enabled" : "Disabled",
          onPress: () => setNotificationsEnabled(!notificationsEnabled),
        },
        {
          icon: "moon-outline",
          label: "Dark Mode",
          subtitle: darkModeEnabled ? "Enabled" : "Coming Soon",
          onPress: () => Alert.alert("Coming Soon", "Dark mode will be available in a future update!"),
        },
        {
          icon: "cash-outline",
          label: "Currency",
          subtitle: "USD ($)",
          onPress: () => Alert.alert("Currency", "Currency settings will be available in a future update!"),
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
          onPress: () => Alert.alert("Help", "Visit our website for help and frequently asked questions."),
          showArrow: true,
        },
        {
          icon: "mail-outline",
          label: "Contact Support",
          onPress: () => Alert.alert("Contact", "Email us at support@budgettracker.app"),
          showArrow: true,
        },
        {
          icon: "star-outline",
          label: "Rate App",
          onPress: () => Alert.alert("Thank You!", "Thanks for using Budget Tracker! Your feedback helps us improve."),
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
          subtitle: "1.0.0",
          onPress: () => {},
        },
        {
          icon: "shield-checkmark-outline",
          label: "Privacy Policy",
          onPress: () => Alert.alert("Privacy Policy", "Your data is stored locally on your device and is never shared."),
          showArrow: true,
        },
        {
          icon: "document-text-outline",
          label: "Terms of Service",
          onPress: () => Alert.alert("Terms", "By using this app, you agree to use it responsibly for personal finance tracking."),
          showArrow: true,
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
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
          <Text style={styles.profileName}>Budget Tracker User</Text>
          <Text style={styles.profileEmail}>Manage your finances wisely</Text>
          
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
                    itemIndex < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemIcon}>
                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  {item.label === "Notifications" && (
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={setNotificationsEnabled}
                      trackColor={{ false: colors.border, true: colors.primaryLight }}
                      thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
                    />
                  )}
                  {item.badge !== undefined && Number(item.badge) > 0 && (
                    <View style={styles.menuItemBadge}>
                      <Text style={styles.menuItemBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  {item.showArrow && (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* Export/Import Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <Card style={styles.menuCard}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemBorder]}
              onPress={() => Alert.alert("Export Data", "Export functionality will be available in a future update!")}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemIcon}>
                <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Export Data</Text>
                <Text style={styles.menuItemSubtitle}>Download your data as CSV</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert(
                "Clear All Data",
                "This will permanently delete all your accounts, transactions, budgets, goals, and categories. This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Clear Data", 
                    style: "destructive",
                    onPress: () => Alert.alert("Not Implemented", "For safety, this feature requires a manual database reset.") 
                  }
                ]
              )}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemIcon}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemLabel, { color: colors.error }]}>Clear All Data</Text>
                <Text style={styles.menuItemSubtitle}>Delete all app data</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Budget Tracker v1.0.0</Text>
          <Text style={styles.footerSubtext}>Made with care for better finances</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  profileStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: '700',
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
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '500',
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
    fontWeight: '600',
    color: colors.textInverse,
  },
  footer: {
    alignItems: 'center',
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
