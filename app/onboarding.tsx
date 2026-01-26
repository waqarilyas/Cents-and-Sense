import { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSafeAreaInsets, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../lib/contexts/UserContext";
import { useAccounts } from "../lib/contexts/AccountContext";
import { useCurrency } from "../lib/contexts/CurrencyContext";
import { CurrencyPicker } from "../lib/components/CurrencyPicker";
import { Currency } from "../lib/currencies";
import {
  spacing,
  borderRadius,
  useThemeColors,
  ThemeColors,
} from "../lib/theme";
import * as Haptics from "expo-haptics";

type OnboardingStep = "welcome" | "name" | "currency" | "complete";

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { setUserProfile, completeOnboarding } = useUser();
  const { addAccount } = useAccounts();
  const { setDefaultCurrency } = useCurrency();

  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [userName, setUserName] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hapticFeedback = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = async () => {
    hapticFeedback();

    switch (step) {
      case "welcome":
        setStep("name");
        break;

      case "name":
        if (!userName.trim()) {
          Alert.alert("Name Required", "Please enter your name to continue");
          return;
        }
        setStep("currency");
        break;

      case "currency":
        await handleFinishOnboarding();
        break;
    }
  };

  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);
    try {
      // Save user profile
      await setUserProfile(userName.trim(), selectedCurrency);

      // Set default currency globally
      await setDefaultCurrency(selectedCurrency);

      // Create default account automatically
      await addAccount(
        "My Account",
        "checking",
        selectedCurrency,
      );

      // Mark onboarding complete
      await completeOnboarding();

      // Show success animation
      setStep("complete");

      // Navigate to main app after brief delay
      setTimeout(() => {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace("/(tabs)");
      }, 1500);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      Alert.alert(
        "Setup Error",
        "There was a problem setting up your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    hapticFeedback();

    switch (step) {
      case "name":
        setStep("welcome");
        break;
      case "currency":
        setStep("name");
        break;
    }
  };

  const handleCurrencySelect = (currency: Currency) => {
    setSelectedCurrency(currency.code);
    setShowCurrencyPicker(false);
  };

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="wallet" size={80} color={colors.primary} />
      </View>

      <Text style={styles.title}>Welcome to Budget Tracker</Text>
      <Text style={styles.subtitle}>
        Take control of your finances with smart budgeting and tracking
      </Text>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={24} color={colors.income} />
          <Text style={styles.featureText}>
            Track expenses across multiple accounts
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={24} color={colors.income} />
          <Text style={styles.featureText}>
            Set budgets and monitor spending
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={24} color={colors.income} />
          <Text style={styles.featureText}>
            Manage subscriptions and goals
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={24} color={colors.income} />
          <Text style={styles.featureText}>
            Multi-currency support
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderNameStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "50%" }]} />
      </View>

      <Text style={styles.stepNumber}>Step 1 of 2</Text>
      <Text style={styles.title}>What's your name?</Text>
      <Text style={styles.subtitle}>
        We'll use this to personalize your experience
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        placeholderTextColor={colors.textSecondary}
        value={userName}
        onChangeText={setUserName}
        autoFocus
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={handleNext}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            !userName.trim() && styles.primaryButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!userName.trim()}
        >
          <Text style={styles.primaryButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrencyStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "100%" }]} />
      </View>

      <Text style={styles.stepNumber}>Step 2 of 2</Text>
      <Text style={styles.title}>Choose your currency</Text>
      <Text style={styles.subtitle}>
        This will be your default currency for new accounts and transactions
      </Text>

      <TouchableOpacity
        style={styles.currencyButton}
        onPress={() => setShowCurrencyPicker(true)}
      >
        <View style={styles.currencyInfo}>
          <Text style={styles.currencyFlag}>
            {(() => {
              const curr = require("../lib/currencies").getCurrency(
                selectedCurrency,
              );
              return curr?.flag || "🌍";
            })()}
          </Text>
          <View>
            <Text style={styles.currencyCode}>{selectedCurrency}</Text>
            <Text style={styles.currencyName}>
              {(() => {
                const curr = require("../lib/currencies").getCurrency(
                  selectedCurrency,
                );
                return curr?.name || "Unknown Currency";
              })()}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleNext} disabled={isSubmitting}>
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? "Setting up..." : "Finish Setup"}
          </Text>
          {!isSubmitting && (
            <Ionicons name="checkmark" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <CurrencyPicker
        visible={showCurrencyPicker}
        selectedCode={selectedCurrency}
        onSelect={handleCurrencySelect}
        onClose={() => setShowCurrencyPicker(false)}
      />
    </View>
  );

  const renderComplete = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={100} color={colors.income} />
      </View>

      <Text style={styles.title}>You're all set!</Text>
      <Text style={styles.subtitle}>
        Welcome to Budget Tracker, {userName}! 🎉
      </Text>
    </View>
  );

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === "welcome" && renderWelcome()}
          {step === "name" && renderNameStep()}
          {step === "currency" && renderCurrencyStep()}
          {step === "complete" && renderComplete()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: spacing.lg,
    },
    stepContainer: {
      flex: 1,
      justifyContent: "center",
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginBottom: spacing.xl,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    stepNumber: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    iconContainer: {
      alignItems: "center",
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
      lineHeight: 24,
    },
    featuresList: {
      marginBottom: spacing.xl,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    featureText: {
      fontSize: 16,
      color: colors.textPrimary,
      marginLeft: spacing.md,
      flex: 1,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    currencyButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.xl,
    },
    currencyInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    currencyFlag: {
      fontSize: 32,
      marginRight: spacing.md,
    },
    currencyCode: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    currencyName: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    accountTypeGrid: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    accountTypeOption: {
      flex: 1,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
    },
    accountTypeOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    accountTypeLabel: {
      fontSize: 12,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.sm,
    },
    accountTypeLabelSelected: {
      color: colors.primary,
      fontWeight: "600",
    },
    buttonRow: {
      flexDirection: "row",
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    primaryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      gap: spacing.sm,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#fff",
    },
    secondaryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      gap: spacing.sm,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
  });
