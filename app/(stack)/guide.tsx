import { useState, useRef, useCallback, useMemo } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
  Linking,
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
} from "../../lib/theme";
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

const getAppFeatures = (colors: ThemeColors): FeatureSection[] => [
  {
    id: "dashboard",
    icon: "home",
    title: "Dashboard",
    description: "Overview of balance, spending, and shortcuts.",
    color: colors.primary,
    tips: ["Pull down to refresh", "Use shortcuts for quick navigation"],
  },
  {
    id: "transactions",
    icon: "swap-vertical",
    title: "Quick Add Transactions",
    description: "Add income or expenses quickly.",
    color: colors.accent,
    tips: ["Tap + to add a transaction", "Select type, amount, and category"],
  },
  {
    id: "accounts",
    icon: "wallet",
    title: "Accounts Management",
    description: "Track checking, savings, and credit cards.",
    color: "#8B5CF6",
    tips: ["Use the edit action to update balances", "Set a default account"],
  },
  {
    id: "budgets",
    icon: "pie-chart",
    title: "Budgets",
    description: "Set category limits and monitor progress.",
    color: colors.warning,
    tips: [
      "Create budgets for key categories",
      "Monitor progress as you spend",
    ],
  },
  {
    id: "subscriptions",
    icon: "repeat",
    title: "Subscriptions",
    description: "Track recurring bills and due dates.",
    color: "#EC4899",
    tips: ["Add recurring expenses", "Review monthly totals"],
  },
  {
    id: "goals",
    icon: "flag",
    title: "Savings Goals",
    description: "Set savings goals and track progress.",
    color: colors.income,
    tips: ["Add contributions regularly", "Track progress over time"],
  },
  {
    id: "analytics",
    icon: "stats-chart",
    title: "Analytics & Insights",
    description: "Review trends and category breakdowns.",
    color: "#3B82F6",
    tips: ["Switch time ranges", "Review category trends"],
  },
  {
    id: "categories",
    icon: "pricetags",
    title: "Categories",
    description: "Customize categories for better tracking.",
    color: "#14B8A6",
    tips: ["Create custom categories", "Assign colors for clarity"],
  },
];

const JOURNEY_STEPS = [
  {
    step: 1,
    title: "Set Up Accounts",
    description: "Add your accounts",
    icon: "wallet" as keyof typeof Ionicons.glyphMap,
    route: "/(stack)/accounts",
  },
  {
    step: 2,
    title: "Create Budgets",
    description: "Set category limits",
    icon: "pie-chart" as keyof typeof Ionicons.glyphMap,
    route: "/(stack)/budgets",
  },
  {
    step: 3,
    title: "Track Transactions",
    description: "Record expenses and income",
    icon: "add-circle" as keyof typeof Ionicons.glyphMap,
    route: null,
  },
  {
    step: 4,
    title: "Add Subscriptions",
    description: "Track recurring payments",
    icon: "repeat" as keyof typeof Ionicons.glyphMap,
    route: "/(stack)/subscriptions",
  },
  {
    step: 5,
    title: "Set Goals",
    description: "Define savings goals",
    icon: "flag" as keyof typeof Ionicons.glyphMap,
    route: "/(stack)/goals",
  },
  {
    step: 6,
    title: "Review Analytics",
    description: "Review spending patterns",
    icon: "analytics" as keyof typeof Ionicons.glyphMap,
    route: "/(stack)/analysis",
  },
];

export default function GuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const appFeatures = useMemo(() => getAppFeatures(colors), [colors]);
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
            <Ionicons name="wallet" size={48} color={colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to Cents and Sense</Text>
          <Text style={styles.welcomeSubtitle}>
            A concise guide to help you get started with your money.
          </Text>
        </View>

        {/* Getting Started Journey */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <Text style={styles.sectionSubtitle}>
            Follow these steps to set up
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
          <Text style={styles.sectionTitle}>Features</Text>
          <Text style={styles.sectionSubtitle}>
            Select a feature to learn more
          </Text>

          {appFeatures.map((feature) => (
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
                  <Text style={styles.featureTipsTitle}>Tips</Text>
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

        {/* Included Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Included In This Release</Text>
          <Card style={styles.premiumCard}>
            <View style={styles.premiumBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>READY</Text>
            </View>
            <Text style={styles.premiumTitle}>Everything You Need To Start</Text>
            <Text style={styles.premiumDescription}>
              This version focuses on fast local budgeting with the core tools
              available from day one.
            </Text>

            <View style={styles.premiumFeatures}>
              <View style={styles.premiumFeatureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.income}
                />
                <Text style={styles.premiumFeatureText}>
                  Analytics and insights
                </Text>
              </View>
              <View style={styles.premiumFeatureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.income}
                />
                <Text style={styles.premiumFeatureText}>
                  Accounts, budgets, and balances
                </Text>
              </View>
              <View style={styles.premiumFeatureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.income}
                />
                <Text style={styles.premiumFeatureText}>
                  Subscription tracking
                </Text>
              </View>
              <View style={styles.premiumFeatureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.income}
                />
                <Text style={styles.premiumFeatureText}>Savings goals</Text>
              </View>
              <View style={styles.premiumFeatureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.income}
                />
                <Text style={styles.premiumFeatureText}>Transaction history and categories</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Best Practices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Best Practices</Text>
          <Card style={styles.bestPracticesCard}>
            <View style={styles.bestPracticeItem}>
              <View
                style={[
                  styles.bestPracticeIcon,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons name="create" size={18} color={colors.primary} />
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
                <Ionicons name="pie-chart" size={18} color={colors.warning} />
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
                <Ionicons name="cash" size={18} color={colors.income} />
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
                <Ionicons name="stats-chart" size={18} color={colors.accent} />
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
              onPress={async () => {
                hapticFeedback();
                try {
                  await Linking.openURL(
                    "https://github.com/waqarilyas/budget-tracker-app-development/discussions",
                  );
                } catch (error) {
                  Alert.alert(
                    "Contact Support",
                    "Could not open the support page.",
                  );
                }
              }}
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
