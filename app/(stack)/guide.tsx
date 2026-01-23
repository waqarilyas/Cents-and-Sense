import { useState, useRef, useCallback } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../../lib/theme";
import { Card } from "../../lib/components";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const { width } = Dimensions.get("window");

interface FeatureSection {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  tips: string[];
}

const APP_FEATURES: FeatureSection[] = [
  {
    id: "dashboard",
    icon: "home",
    title: "Dashboard",
    description:
      "Your financial command center. See your total balance, monthly spending insights, and quick access to all features.",
    color: colors.primary,
    tips: [
      "Pull down to refresh your data",
      "Tap the balance card for detailed account info",
      "Quick access shortcuts let you navigate faster",
      "The insight card shows personalized tips based on your spending",
    ],
  },
  {
    id: "transactions",
    icon: "swap-vertical",
    title: "Quick Add Transactions",
    description:
      "The fastest way to track your money. Use the floating + button to add expenses or income in seconds.",
    color: colors.accent,
    tips: [
      "Tap the + button to quickly add a transaction",
      "Choose expense or income type first",
      "Enter amount with the numpad, then pick a category",
      "Select 'Subscription' for recurring expenses",
    ],
  },
  {
    id: "accounts",
    icon: "wallet",
    title: "Accounts Management",
    description:
      "Track all your money sources - checking accounts, savings, and credit cards in one place.",
    color: "#8B5CF6",
    tips: [
      "Add multiple accounts for complete financial picture",
      "Tap an account to edit its balance",
      "Long press to delete an account",
      "Total balance shows across all accounts",
    ],
  },
  {
    id: "budgets",
    icon: "pie-chart",
    title: "Budgets",
    description:
      "Set spending limits for categories and stay on track with visual progress bars.",
    color: colors.warning,
    tips: [
      "Create budgets for your spending categories",
      "Watch the progress bar fill as you spend",
      "Get alerts when approaching your limits",
      "Monthly or yearly budget periods available",
    ],
  },
  {
    id: "subscriptions",
    icon: "repeat",
    title: "Subscriptions",
    description:
      "Never forget a recurring payment. Track Netflix, Spotify, rent, and all your subscriptions.",
    color: "#EC4899",
    tips: [
      "Add all your recurring expenses",
      "See monthly cost at a glance",
      "Get reminders before payments are due",
      "Easily pause or cancel subscriptions",
    ],
  },
  {
    id: "goals",
    icon: "flag",
    title: "Savings Goals",
    description:
      "Dream big and save smart. Set financial goals and track your progress.",
    color: colors.income,
    tips: [
      "Create goals for vacations, emergencies, purchases",
      "Add contributions regularly",
      "Watch your progress grow",
      "Celebrate when you reach your goals! 🎉",
    ],
  },
  {
    id: "analytics",
    icon: "stats-chart",
    title: "Analytics & Insights",
    description:
      "Understand your money habits with powerful charts and detailed breakdowns.",
    color: "#3B82F6",
    tips: [
      "Switch between week, month, or year views",
      "See expense breakdown by category",
      "Track income sources",
      "Compare spending patterns over time",
    ],
  },
  {
    id: "categories",
    icon: "pricetags",
    title: "Categories",
    description:
      "Organize your transactions with customizable categories for better tracking.",
    color: "#14B8A6",
    tips: [
      "Default categories cover most needs",
      "Create custom categories for your lifestyle",
      "Assign colors for easy identification",
      "Separate expense and income categories",
    ],
  },
];

const JOURNEY_STEPS = [
  {
    step: 1,
    title: "Set Up Accounts",
    description:
      "Start by adding your bank accounts, savings, and credit cards",
    icon: "wallet" as keyof typeof Ionicons.glyphMap,
    route: "/(stack)/accounts",
  },
  {
    step: 2,
    title: "Create Budgets",
    description: "Set spending limits for different categories",
    icon: "pie-chart" as keyof typeof Ionicons.glyphMap,
    route: "/(stack)/budgets",
  },
  {
    step: 3,
    title: "Track Transactions",
    description: "Record your daily expenses and income",
    icon: "add-circle" as keyof typeof Ionicons.glyphMap,
    route: null,
  },
  {
    step: 4,
    title: "Add Subscriptions",
    description: "Don't forget recurring payments",
    icon: "repeat" as keyof typeof Ionicons.glyphMap,
    route: "/(stack)/subscriptions",
  },
  {
    step: 5,
    title: "Set Goals",
    description: "Define what you're saving for",
    icon: "flag" as keyof typeof Ionicons.glyphMap,
    route: "/(stack)/goals",
  },
  {
    step: 6,
    title: "Review Analytics",
    description: "Understand your spending patterns",
    icon: "analytics" as keyof typeof Ionicons.glyphMap,
    route: "/(stack)/analysis",
  },
];

export default function GuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const hapticFeedback = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleFeature = (id: string) => {
    hapticFeedback();
    setSelectedFeature(selectedFeature === id ? null : id);
  };

  const navigateTo = (route: string | null) => {
    if (route) {
      hapticFeedback();
      router.push(route as any);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticFeedback();
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Guide</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="sparkles" size={48} color={colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to Budget Tracker</Text>
          <Text style={styles.welcomeSubtitle}>
            Your premium personal finance companion. Let's help you take control
            of your money!
          </Text>
        </View>

        {/* Getting Started Journey */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Getting Started</Text>
          <Text style={styles.sectionSubtitle}>
            Follow these steps to set up your financial tracking
          </Text>

          <Card style={styles.journeyCard}>
            {JOURNEY_STEPS.map((step, index) => (
              <TouchableOpacity
                key={step.step}
                style={[
                  styles.journeyStep,
                  index < JOURNEY_STEPS.length - 1 && styles.journeyStepBorder,
                ]}
                onPress={() => navigateTo(step.route)}
                activeOpacity={step.route ? 0.7 : 1}
              >
                <View style={styles.journeyStepNumber}>
                  <Text style={styles.journeyStepNumberText}>{step.step}</Text>
                </View>
                <View style={styles.journeyStepContent}>
                  <View style={styles.journeyStepHeader}>
                    <Ionicons
                      name={step.icon}
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.journeyStepTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.journeyStepDescription}>
                    {step.description}
                  </Text>
                </View>
                {step.route && (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textMuted}
                  />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* Features Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Features Guide</Text>
          <Text style={styles.sectionSubtitle}>
            Tap each feature to learn more
          </Text>

          {APP_FEATURES.map((feature) => (
            <Card key={feature.id} style={styles.featureCard}>
              <TouchableOpacity
                style={styles.featureHeader}
                onPress={() => toggleFeature(feature.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.featureIcon,
                    { backgroundColor: feature.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={feature.icon}
                    size={24}
                    color={feature.color}
                  />
                </View>
                <View style={styles.featureHeaderContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text
                    style={styles.featureDescription}
                    numberOfLines={
                      selectedFeature === feature.id ? undefined : 2
                    }
                  >
                    {feature.description}
                  </Text>
                </View>
                <Ionicons
                  name={
                    selectedFeature === feature.id
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={24}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {selectedFeature === feature.id && (
                <View style={styles.featureTips}>
                  <Text style={styles.featureTipsTitle}>💡 Pro Tips</Text>
                  {feature.tips.map((tip, index) => (
                    <View key={index} style={styles.featureTipItem}>
                      <View
                        style={[
                          styles.tipBullet,
                          { backgroundColor: feature.color },
                        ]}
                      />
                      <Text style={styles.featureTipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ))}
        </View>

        {/* Pro Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⭐ Premium Features</Text>
          <Card style={styles.premiumCard}>
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={16} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
            <Text style={styles.premiumTitle}>Unlock Your Full Potential</Text>
            <Text style={styles.premiumDescription}>
              You have access to all premium features including advanced
              analytics, unlimited accounts, custom categories, and more!
            </Text>

            <View style={styles.premiumFeatures}>
              <View style={styles.premiumFeatureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.income}
                />
                <Text style={styles.premiumFeatureText}>
                  Advanced Analytics & Reports
                </Text>
              </View>
              <View style={styles.premiumFeatureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.income}
                />
                <Text style={styles.premiumFeatureText}>
                  Unlimited Accounts & Budgets
                </Text>
              </View>
              <View style={styles.premiumFeatureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.income}
                />
                <Text style={styles.premiumFeatureText}>
                  Subscription Tracking
                </Text>
              </View>
              <View style={styles.premiumFeatureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.income}
                />
                <Text style={styles.premiumFeatureText}>Savings Goals</Text>
              </View>
              <View style={styles.premiumFeatureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.income}
                />
                <Text style={styles.premiumFeatureText}>Data Export</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Best Practices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Best Practices</Text>
          <Card style={styles.bestPracticesCard}>
            <View style={styles.bestPracticeItem}>
              <View
                style={[
                  styles.bestPracticeIcon,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Text style={styles.bestPracticeEmoji}>📝</Text>
              </View>
              <View style={styles.bestPracticeContent}>
                <Text style={styles.bestPracticeTitle}>Track Daily</Text>
                <Text style={styles.bestPracticeText}>
                  Record transactions as they happen for accurate tracking
                </Text>
              </View>
            </View>
            <View style={styles.bestPracticeItem}>
              <View
                style={[
                  styles.bestPracticeIcon,
                  { backgroundColor: colors.warningLight },
                ]}
              >
                <Text style={styles.bestPracticeEmoji}>🎯</Text>
              </View>
              <View style={styles.bestPracticeContent}>
                <Text style={styles.bestPracticeTitle}>
                  Set Realistic Budgets
                </Text>
                <Text style={styles.bestPracticeText}>
                  Start with budgets you can maintain, then adjust
                </Text>
              </View>
            </View>
            <View style={styles.bestPracticeItem}>
              <View
                style={[
                  styles.bestPracticeIcon,
                  { backgroundColor: colors.incomeLight },
                ]}
              >
                <Text style={styles.bestPracticeEmoji}>💪</Text>
              </View>
              <View style={styles.bestPracticeContent}>
                <Text style={styles.bestPracticeTitle}>Save 20% Rule</Text>
                <Text style={styles.bestPracticeText}>
                  Try to save at least 20% of your income each month
                </Text>
              </View>
            </View>
            <View style={styles.bestPracticeItem}>
              <View
                style={[
                  styles.bestPracticeIcon,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <Text style={styles.bestPracticeEmoji}>📊</Text>
              </View>
              <View style={styles.bestPracticeContent}>
                <Text style={styles.bestPracticeTitle}>Review Weekly</Text>
                <Text style={styles.bestPracticeText}>
                  Check your analytics weekly to stay on track
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Card style={styles.helpCard}>
            <Ionicons name="help-circle" size={40} color={colors.primary} />
            <Text style={styles.helpTitle}>Need More Help?</Text>
            <Text style={styles.helpText}>
              Contact our support team for personalized assistance
            </Text>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => hapticFeedback()}
            >
              <Ionicons name="mail" size={18} color="#FFF" />
              <Text style={styles.helpButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </Card>
        </View>

        <View style={{ height: 120 }} />
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

  // Welcome Section
  welcomeSection: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  welcomeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Journey Card
  journeyCard: {
    padding: 0,
    overflow: "hidden",
  },
  journeyStep: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  journeyStepBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  journeyStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  journeyStepNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  journeyStepContent: {
    flex: 1,
  },
  journeyStepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  journeyStepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  journeyStepDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Feature Cards
  featureCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: "hidden",
  },
  featureHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  featureHeaderContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  featureTips: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  featureTipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  featureTipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: spacing.sm,
  },
  featureTipText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Premium Card
  premiumCard: {
    backgroundColor: "#1A1A2E",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFD700",
  },
  premiumTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: spacing.sm,
  },
  premiumDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  premiumFeatures: {
    gap: spacing.sm,
  },
  premiumFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  premiumFeatureText: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "500",
  },

  // Best Practices Card
  bestPracticesCard: {
    padding: spacing.md,
  },
  bestPracticeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  bestPracticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  bestPracticeEmoji: {
    fontSize: 20,
  },
  bestPracticeContent: {
    flex: 1,
  },
  bestPracticeTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  bestPracticeText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Help Card
  helpCard: {
    alignItems: "center",
    padding: spacing.xl,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
});
