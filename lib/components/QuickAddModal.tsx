import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
  Animated,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { spacing, borderRadius, useThemeColors, ThemeColors } from "../theme";
import { useTransactions } from "../contexts/TransactionContext";
import { useCategories } from "../contexts/CategoryContext";
import { useAccounts } from "../contexts/AccountContext";
import { useSubscriptions } from "../contexts/SubscriptionContext";
import { useUser } from "../contexts/UserContext";
import { getCurrencySymbol } from "../currencies";
import * as Haptics from "expo-haptics";
import {
  matchCategoryByDescription,
  getCategorySuggestions,
  CategoryDefinition,
} from "../smartCategories";

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Enhanced category icon mapping
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Food & Dining": "restaurant",
  "Coffee & Cafe": "cafe",
  Groceries: "cart",
  Transportation: "car",
  Shopping: "bag-handle",
  Entertainment: "film",
  "Health & Fitness": "fitness",
  "Bills & Utilities": "flash",
  Housing: "home",
  Travel: "airplane",
  Education: "school",
  "Personal Care": "happy",
  Pets: "paw",
  "Kids & Family": "people",
  Insurance: "shield-checkmark",
  "Gifts & Donations": "gift",
  "Alcohol & Bars": "beer",
  Subscriptions: "repeat",
  "ATM & Cash": "cash",
  "Fees & Charges": "alert-circle",
  Taxes: "document-text",
  "Other Expense": "ellipsis-horizontal",
  Salary: "briefcase",
  Freelance: "laptop",
  "Business Income": "storefront",
  Investment: "trending-up",
  "Rental Income": "key",
  Refund: "arrow-undo",
  "Gift Received": "gift",
  Government: "business",
  "Other Income": "ellipsis-horizontal",
  Health: "fitness",
  Healthcare: "fitness",
  Utilities: "flash",
  Coffee: "cafe",
  Personal: "person",
  Gift: "gift",
  Other: "ellipsis-horizontal",
};

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
}

type Step = "amount" | "details" | "subscription";

// Popular subscription icons
const SUBSCRIPTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Netflix: "tv",
  Spotify: "musical-notes",
  "Apple Music": "musical-notes",
  YouTube: "play",
  "Amazon Prime": "cube",
  "Disney+": "film",
  "HBO Max": "film",
  Hulu: "tv",
  iCloud: "cloud",
  "Google One": "cloud",
  Dropbox: "folder",
  "Microsoft 365": "document",
  Adobe: "color-palette",
  Gym: "fitness",
  Insurance: "shield-checkmark",
  Phone: "call",
  Internet: "wifi",
  Electricity: "flash",
  Water: "water",
  Gas: "flame",
  Rent: "home",
  Mortgage: "home",
  default: "repeat",
};

const getSubscriptionIcon = (
  subName: string,
): keyof typeof Ionicons.glyphMap => {
  for (const [key, icon] of Object.entries(SUBSCRIPTION_ICONS)) {
    if (subName.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return "repeat";
};

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { addTransaction, refreshTransactions } = useTransactions();
  const { expenseCategories, incomeCategories } = useCategories();
  const { accounts, refreshAccounts } = useAccounts();
  const { addSubscription, refreshSubscriptions } = useSubscriptions();
  const { defaultCurrency } = useUser();

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState<"expense" | "income">(
    "expense",
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedCategory, setSuggestedCategory] =
    useState<CategoryDefinition | null>(null);
  const [suggestions, setSuggestions] = useState<CategoryDefinition[]>([]);

  // Account state - REQUIRED for all transactions
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  // Get currency from selected account
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const accountCurrency = selectedAccount?.currency || defaultCurrency;

  // Subscription-specific state
  const [subscriptionName, setSubscriptionName] = useState("");
  const [subscriptionFrequency, setSubscriptionFrequency] =
    useState<Frequency>("monthly");
  const [subscriptionCategoryId, setSubscriptionCategoryId] = useState<
    string | null
  >(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const descriptionInputRef = useRef<TextInput>(null);

  const categories =
    transactionType === "expense" ? expenseCategories : incomeCategories;

  // Smart categorization effect
  useEffect(() => {
    if (description.length >= 2) {
      const match = matchCategoryByDescription(description, transactionType);
      setSuggestedCategory(match);

      // Auto-select the suggested category
      if (match && !selectedCategoryId) {
        const dbCategory = categories.find(
          (c) => c.name.toLowerCase() === match.name.toLowerCase(),
        );
        if (dbCategory) {
          setSelectedCategoryId(dbCategory.id);
        }
      }

      const allSuggestions = getCategorySuggestions(
        description,
        transactionType,
        5,
      );
      setSuggestions(allSuggestions);
    } else {
      setSuggestedCategory(null);
      setSuggestions([]);
    }
  }, [description, transactionType, categories]);

  // Reset selected category when type changes
  useEffect(() => {
    setSelectedCategoryId(null);
    setSuggestedCategory(null);
    setSuggestions([]);
  }, [transactionType]);

  useEffect(() => {
    if (visible) {
      setStep("amount");
      setAmount("0");
      setDescription("");
      setTransactionType("expense");
      setSelectedCategoryId(null);
      setShowSuccess(false);
      setSuggestedCategory(null);
      setSuggestions([]);
      setSubscriptionName("");
      setSubscriptionFrequency("monthly");
      setSubscriptionCategoryId(null);
      // Auto-select the first account if available
      setSelectedAccountId(accounts.length > 0 ? accounts[0].id : null);
      slideAnim.setValue(0);
      successAnim.setValue(0);
    }
  }, [visible, accounts]);

  const handleClose = useCallback(() => {
    setAmount("0");
    setDescription("");
    setSelectedCategoryId(null);
    setSelectedAccountId(null);
    setStep("amount");
    setShowSuccess(false);
    setSuggestedCategory(null);
    setSuggestions([]);
    setSubscriptionName("");
    setSubscriptionFrequency("monthly");
    setSubscriptionCategoryId(null);
    onClose();
  }, [onClose]);

  const hapticFeedback = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNumberPress = useCallback((num: string) => {
    hapticFeedback();
    setAmount((prev) => {
      if (num === "." && prev.includes(".")) return prev;
      if (prev === "0" && num !== ".") return num;
      if (prev.includes(".") && prev.split(".")[1]?.length >= 2) return prev;
      if (prev.length >= 10) return prev;
      return prev + num;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    hapticFeedback();
    setAmount((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  }, []);

  const handleContinue = useCallback(() => {
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    hapticFeedback();
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start(() => {
      setTimeout(() => {
        descriptionInputRef.current?.focus();
      }, 100);
    });
    setStep("details");
  }, [amount, slideAnim]);

  const handleBack = useCallback(() => {
    hapticFeedback();
    if (step === "subscription") {
      // Go back to details step
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
      setStep("details");
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      setStep("amount");
    }
  }, [slideAnim, step]);

  const handleMakeRecurring = useCallback(() => {
    hapticFeedback();
    // Pre-fill subscription name from description if available
    if (description.trim()) {
      setSubscriptionName(description.trim());
    }
    // Set first category as default for subscription
    if (expenseCategories.length > 0 && !subscriptionCategoryId) {
      setSubscriptionCategoryId(expenseCategories[0].id);
    }
    // Slide to subscription step
    Animated.spring(slideAnim, {
      toValue: 2,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
    setStep("subscription");
  }, [description, slideAnim, expenseCategories, subscriptionCategoryId]);

  const handleSaveSubscription = useCallback(async () => {
    const amountNum = parseFloat(amount);
    if (!subscriptionName.trim()) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }
    if (amountNum <= 0) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }
    if (!subscriptionCategoryId) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
      const subCurrency = selectedAccount?.currency || accountCurrency;

      await addSubscription(
        subscriptionName.trim(),
        amountNum,
        subscriptionCategoryId,
        subscriptionFrequency,
        Date.now(),
        subCurrency,
        3,
        undefined,
      );

      // Refresh immediately after adding
      refreshSubscriptions();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setShowSuccess(true);
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ]).start(() => {
        handleClose();
      });
    } catch (error) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    amount,
    subscriptionName,
    subscriptionCategoryId,
    subscriptionFrequency,
    addSubscription,
    refreshSubscriptions,
    handleClose,
    successAnim,
  ]);

  const handleSave = useCallback(async () => {
    const amountNum = parseFloat(amount);
    if (
      amountNum <= 0 ||
      !selectedCategoryId ||
      !selectedAccountId ||
      isSubmitting
    )
      return;

    setIsSubmitting(true);

    try {
      await addTransaction(
        selectedAccountId, // REQUIRED first parameter
        selectedCategoryId,
        amountNum,
        description.trim(),
        Date.now(),
        transactionType,
      );

      // Refresh immediately after adding
      refreshAccounts();
      refreshTransactions();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setShowSuccess(true);
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ]).start(() => {
        handleClose();
      });
    } catch (error) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    amount,
    description,
    selectedCategoryId,
    selectedAccountId,
    transactionType,
    addTransaction,
    refreshAccounts,
    refreshTransactions,
    handleClose,
    isSubmitting,
    successAnim,
  ]);

  const getCategoryIcon = (name: string): keyof typeof Ionicons.glyphMap => {
    return CATEGORY_ICONS[name] || "ellipsis-horizontal";
  };

  const numpadButtons = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"],
  ];

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, -SCREEN_WIDTH, -SCREEN_WIDTH * 2],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={
                step === "details" || step === "subscription"
                  ? handleBack
                  : handleClose
              }
              style={styles.headerButton}
            >
              <Ionicons
                name={
                  step === "details" || step === "subscription"
                    ? "arrow-back"
                    : "close"
                }
                size={28}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {step === "amount"
                ? "Quick Add"
                : step === "details"
                  ? "Add Details"
                  : "Add Subscription"}
            </Text>
            <View style={styles.headerButton} />
          </View>

          {/* Success Overlay */}
          {showSuccess && (
            <Animated.View
              style={[
                styles.successOverlay,
                {
                  opacity: successAnim,
                  transform: [
                    {
                      scale: successAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={64} color="#FFFFFF" />
              </View>
              <Text style={styles.successText}>Added!</Text>
            </Animated.View>
          )}

          {/* Sliding Content */}
          <Animated.View
            style={[
              styles.slidingContainer,
              { transform: [{ translateX }], width: SCREEN_WIDTH * 3 },
            ]}
          >
            {/* Step 1: Amount Entry */}
            <View style={styles.amountStep}>
              {/* Type Toggle */}
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === "expense" &&
                      styles.typeButtonExpenseActive,
                  ]}
                  onPress={() => {
                    hapticFeedback();
                    setTransactionType("expense");
                  }}
                >
                  <Ionicons
                    name="arrow-up"
                    size={18}
                    color={
                      transactionType === "expense" ? "#FFF" : colors.expense
                    }
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === "expense" &&
                        styles.typeButtonTextActive,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === "income" &&
                      styles.typeButtonIncomeActive,
                  ]}
                  onPress={() => {
                    hapticFeedback();
                    setTransactionType("income");
                  }}
                >
                  <Ionicons
                    name="arrow-down"
                    size={18}
                    color={
                      transactionType === "income" ? "#FFF" : colors.income
                    }
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === "income" &&
                        styles.typeButtonTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount Display */}
              <View style={styles.amountDisplay}>
                <View style={styles.currencyDisplay}>
                  <Text style={styles.currencyDisplayText}>
                    {getCurrencySymbol(accountCurrency)}
                  </Text>
                  <Text style={styles.currencyCodeText}>{accountCurrency}</Text>
                </View>
                <Text
                  style={[
                    styles.amountText,
                    {
                      color:
                        transactionType === "expense"
                          ? colors.expense
                          : colors.income,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {amount}
                </Text>
              </View>

              {/* Numpad */}
              <View style={styles.numpad}>
                {numpadButtons.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.numpadRow}>
                    {row.map((btn) => (
                      <TouchableOpacity
                        key={btn}
                        style={styles.numpadButton}
                        onPress={() =>
                          btn === "⌫"
                            ? handleBackspace()
                            : handleNumberPress(btn)
                        }
                        activeOpacity={0.6}
                      >
                        {btn === "⌫" ? (
                          <Ionicons
                            name="backspace-outline"
                            size={28}
                            color={colors.textPrimary}
                          />
                        ) : (
                          <Text style={styles.numpadButtonText}>{btn}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>

              {/* Continue Button */}
              <View
                style={[
                  styles.buttonContainer,
                  { paddingBottom: insets.bottom + spacing.lg },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    {
                      backgroundColor:
                        transactionType === "expense"
                          ? colors.expense
                          : colors.income,
                    },
                    (parseFloat(amount) <= 0 || !selectedAccountId) &&
                      styles.continueButtonDisabled,
                  ]}
                  onPress={handleContinue}
                  disabled={parseFloat(amount) <= 0 || !selectedAccountId}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueButtonText}>
                    {!selectedAccountId ? "Select Account First" : "Next"}
                  </Text>
                  {selectedAccountId && (
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Step 2: Description + Category Selection (Combined) */}
            <View style={styles.detailsStep}>
              {/* Amount Summary */}
              <View style={styles.amountSummaryCompact}>
                <Text
                  style={[
                    styles.amountSummaryText,
                    {
                      color:
                        transactionType === "expense"
                          ? colors.expense
                          : colors.income,
                    },
                  ]}
                >
                  {transactionType === "expense" ? "-" : "+"}${amount}
                </Text>
              </View>

              {/* Description Input */}
              <View style={styles.descriptionInputContainer}>
                <Ionicons
                  name="create-outline"
                  size={22}
                  color={colors.textSecondary}
                />
                <TextInput
                  ref={descriptionInputRef}
                  style={styles.descriptionInput}
                  placeholder={
                    transactionType === "expense"
                      ? "What did you spend on? (optional)"
                      : "What's this income from? (optional)"
                  }
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  autoCapitalize="sentences"
                  autoCorrect={true}
                />
                {description.length > 0 && (
                  <TouchableOpacity onPress={() => setDescription("")}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Account Selector (REQUIRED) */}
              {accounts.length > 0 ? (
                <View style={styles.accountSelectorContainer}>
                  <Text
                    style={[styles.accountSelectorLabel, { fontWeight: "600" }]}
                  >
                    Select Account *
                  </Text>
                  {!selectedAccountId && (
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        marginBottom: spacing.xs,
                      }}
                    >
                      Choose which account this transaction affects
                    </Text>
                  )}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.accountChipsContainer}
                  >
                    {accounts.map((account) => {
                      const isSelected = selectedAccountId === account.id;
                      const iconName =
                        account.type === "checking"
                          ? "business-outline"
                          : account.type === "savings"
                            ? "wallet-outline"
                            : "card-outline";
                      return (
                        <TouchableOpacity
                          key={account.id}
                          style={[
                            styles.accountChip,
                            isSelected && styles.accountChipSelected,
                          ]}
                          onPress={() => {
                            hapticFeedback();
                            setSelectedAccountId(account.id);
                          }}
                        >
                          <Ionicons
                            name={iconName}
                            size={16}
                            color={
                              isSelected ? colors.primary : colors.textSecondary
                            }
                          />
                          <Text
                            style={[
                              styles.accountChipText,
                              isSelected && styles.accountChipTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {account.name}
                          </Text>
                          <Text
                            style={[
                              styles.accountCurrencyText,
                              isSelected && { color: colors.primary },
                            ]}
                          >
                            {account.currency}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color={colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.noAccountsContainer}>
                  <Ionicons
                    name="wallet-outline"
                    size={32}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.noAccountsText}>No accounts found</Text>
                  <Text style={styles.noAccountsSubtext}>
                    Create an account first
                  </Text>
                  <TouchableOpacity
                    style={styles.createAccountButton}
                    onPress={() => {
                      handleClose();
                      router.push("/(stack)/accounts");
                    }}
                  >
                    <Text style={styles.createAccountButtonText}>
                      Go to Accounts
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Smart Suggestion Banner */}
              {suggestedCategory && (
                <View style={styles.smartMatchBanner}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                  <Text style={styles.smartMatchText}>
                    Smart match: {suggestedCategory.emoji}{" "}
                    {suggestedCategory.name}
                  </Text>
                </View>
              )}

              {/* Category Grid */}
              <Text style={styles.categoryLabel}>Select Category</Text>
              <ScrollView
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryGrid}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Quick Suggestions Row */}
                {suggestions.length > 0 && (
                  <View style={styles.suggestionsRow}>
                    {suggestions.slice(0, 4).map((cat) => {
                      const dbCategory = categories.find(
                        (c) => c.name.toLowerCase() === cat.name.toLowerCase(),
                      );
                      if (!dbCategory) return null;
                      const isSelected = selectedCategoryId === dbCategory.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.suggestionChip,
                            { borderColor: cat.color },
                            isSelected && { backgroundColor: cat.color + "20" },
                          ]}
                          onPress={() => {
                            hapticFeedback();
                            setSelectedCategoryId(dbCategory.id);
                          }}
                        >
                          <Text style={styles.suggestionEmoji}>
                            {cat.emoji}
                          </Text>
                          <Text
                            style={[
                              styles.suggestionChipText,
                              isSelected && {
                                color: cat.color,
                                fontWeight: "600",
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {cat.name}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color={cat.color}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Subscription Option */}
                {transactionType === "expense" && (
                  <TouchableOpacity
                    style={[styles.categoryItem, styles.subscriptionItem]}
                    onPress={handleMakeRecurring}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.categoryIcon, styles.subscriptionIcon]}
                    >
                      <Ionicons
                        name="repeat"
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryItemName,
                        { color: colors.primary },
                      ]}
                    >
                      Subscription
                    </Text>
                  </TouchableOpacity>
                )}

                {/* All Categories */}
                {categories.map((category) => {
                  const isSelected = selectedCategoryId === category.id;
                  const isMatched =
                    suggestedCategory &&
                    category.name.toLowerCase() ===
                      suggestedCategory.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryItem,
                        isSelected && styles.categoryItemSelected,
                        isSelected && { borderColor: category.color },
                      ]}
                      onPress={() => {
                        hapticFeedback();
                        setSelectedCategoryId(category.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: category.color + "15" },
                          isSelected && {
                            backgroundColor: category.color + "30",
                          },
                        ]}
                      >
                        <Ionicons
                          name={getCategoryIcon(category.name)}
                          size={24}
                          color={category.color}
                        />
                        {isMatched && !isSelected && (
                          <View
                            style={[
                              styles.matchDot,
                              { backgroundColor: colors.primary },
                            ]}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.categoryItemName,
                          isSelected && { fontWeight: "600" },
                        ]}
                        numberOfLines={1}
                      >
                        {category.name}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={category.color}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}

                <View style={{ height: 120 }} />
              </ScrollView>

              {/* Save Button */}
              <View
                style={[
                  styles.saveButtonContainer,
                  { paddingBottom: insets.bottom + spacing.md },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor:
                        transactionType === "expense"
                          ? colors.expense
                          : colors.income,
                    },
                    (!selectedCategoryId || isSubmitting) &&
                      styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!selectedCategoryId || isSubmitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={22} color="#FFF" />
                  <Text style={styles.saveButtonText}>
                    {isSubmitting ? "Saving..." : "Save Transaction"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Step 3: Subscription Details */}
            <View style={styles.subscriptionStep}>
              {/* Amount Summary */}
              <View style={styles.amountSummaryCompact}>
                <View style={styles.subscriptionHeader}>
                  <Ionicons name="repeat" size={24} color={colors.primary} />
                  <Text
                    style={[
                      styles.amountSummaryText,
                      { color: colors.expense },
                    ]}
                  >
                    -${amount}
                  </Text>
                </View>
                <Text style={styles.subscriptionSubtitle}>
                  per {subscriptionFrequency}
                </Text>
              </View>

              <ScrollView
                style={styles.subscriptionContent}
                contentContainerStyle={styles.subscriptionScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Subscription Name</Text>
                  <View style={styles.subscriptionInputContainer}>
                    <Ionicons
                      name={getSubscriptionIcon(subscriptionName)}
                      size={22}
                      color={colors.primary}
                    />
                    <TextInput
                      style={styles.subscriptionInput}
                      placeholder="e.g., Netflix, Spotify, Gym"
                      placeholderTextColor={colors.textMuted}
                      value={subscriptionName}
                      onChangeText={setSubscriptionName}
                      autoCapitalize="words"
                    />
                    {subscriptionName.length > 0 && (
                      <TouchableOpacity onPress={() => setSubscriptionName("")}>
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Frequency Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Billing Frequency</Text>
                  <View style={styles.frequencyRow}>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.frequencyButton,
                          subscriptionFrequency === option.value &&
                            styles.frequencyButtonActive,
                        ]}
                        onPress={() => {
                          hapticFeedback();
                          setSubscriptionFrequency(option.value);
                        }}
                      >
                        <Text
                          style={[
                            styles.frequencyButtonText,
                            subscriptionFrequency === option.value &&
                              styles.frequencyButtonTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Category Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.horizontalCategoryScroll}
                  >
                    {expenseCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          subscriptionCategoryId === cat.id && {
                            backgroundColor: cat.color + "30",
                            borderColor: cat.color,
                          },
                        ]}
                        onPress={() => {
                          hapticFeedback();
                          setSubscriptionCategoryId(cat.id);
                        }}
                      >
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: cat.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            subscriptionCategoryId === cat.id && {
                              color: cat.color,
                              fontWeight: "600",
                            },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Yearly estimate */}
                <View style={styles.estimateCard}>
                  <Ionicons
                    name="calculator-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <View style={styles.estimateContent}>
                    <Text style={styles.estimateLabel}>Yearly estimate</Text>
                    <Text style={styles.estimateValue}>
                      $
                      {(
                        parseFloat(amount) *
                        (subscriptionFrequency === "weekly"
                          ? 52
                          : subscriptionFrequency === "monthly"
                            ? 12
                            : 1)
                      ).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 100 }} />
              </ScrollView>

              {/* Save Subscription Button */}
              <View
                style={[
                  styles.saveButtonContainer,
                  { paddingBottom: insets.bottom + spacing.md },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: colors.primary },
                    (!subscriptionName.trim() ||
                      !subscriptionCategoryId ||
                      isSubmitting) &&
                      styles.saveButtonDisabled,
                  ]}
                  onPress={handleSaveSubscription}
                  disabled={
                    !subscriptionName.trim() ||
                    !subscriptionCategoryId ||
                    isSubmitting
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="repeat" size={22} color="#FFF" />
                  <Text style={styles.saveButtonText}>
                    {isSubmitting ? "Saving..." : "Save Subscription"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const BUTTON_SIZE = Math.min((SCREEN_WIDTH - 80) / 3, 72);

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    successOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.85)",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
    },
    successIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.income,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    successText: {
      fontSize: 24,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    slidingContainer: {
      flex: 1,
      flexDirection: "row",
      width: SCREEN_WIDTH * 3,
    },
    amountStep: {
      width: SCREEN_WIDTH,
      paddingHorizontal: spacing.lg,
      justifyContent: "space-between",
    },
    detailsStep: {
      width: SCREEN_WIDTH,
      flex: 1,
    },
    typeToggle: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
      marginTop: spacing.lg,
    },
    typeButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      borderRadius: 10,
      gap: spacing.xs,
    },
    typeButtonExpenseActive: {
      backgroundColor: colors.expense,
    },
    typeButtonIncomeActive: {
      backgroundColor: colors.income,
    },
    typeButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    typeButtonTextActive: {
      color: "#FFFFFF",
    },
    amountDisplay: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    currencyDisplay: {
      flexDirection: "column",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      gap: 2,
    },
    currencyDisplayText: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    currencyCodeText: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    currencyButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      gap: 4,
    },
    currencyButtonText: {
      fontSize: 24,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    amountText: {
      fontSize: 56,
      fontWeight: "700",
    },
    numpad: {
      alignItems: "center",
    },
    numpadRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.lg,
      marginBottom: spacing.md,
    },
    numpadButton: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    numpadButtonText: {
      fontSize: 28,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    buttonContainer: {
      paddingTop: spacing.md,
    },
    continueButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      borderRadius: 16,
      gap: spacing.sm,
    },
    continueButtonDisabled: {
      opacity: 0.4,
    },
    continueButtonText: {
      fontSize: 18,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    // Details Step
    amountSummaryCompact: {
      alignItems: "center",
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
    },
    amountSummaryText: {
      fontSize: 32,
      fontWeight: "700",
    },
    descriptionInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      gap: spacing.sm,
    },
    descriptionInput: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
      paddingVertical: spacing.xs,
    },
    accountSelectorContainer: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    accountSelectorLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    accountChipsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    accountChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    accountChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    accountChipText: {
      fontSize: 13,
      color: colors.textSecondary,
      maxWidth: 120,
    },
    accountChipTextSelected: {
      color: colors.primary,
      fontWeight: "600",
    },
    accountCurrencyText: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    noAccountsContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xl * 2,
      paddingHorizontal: spacing.lg,
      marginHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      gap: spacing.sm,
    },
    noAccountsText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    noAccountsSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    createAccountButton: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
    },
    createAccountButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    smartMatchBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      backgroundColor: colors.primary + "10",
      borderRadius: 8,
    },
    smartMatchText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "500",
    },
    categoryLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    categoryScroll: {
      flex: 1,
    },
    categoryGrid: {
      paddingHorizontal: spacing.md,
    },
    suggestionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    suggestionChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      borderWidth: 1.5,
      gap: 4,
    },
    suggestionEmoji: {
      fontSize: 14,
    },
    suggestionChipText: {
      fontSize: 13,
      color: colors.textPrimary,
      maxWidth: 80,
    },
    categoryItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.xs,
      borderRadius: 12,
      gap: spacing.sm,
    },
    categoryItemSelected: {
      backgroundColor: colors.surface,
      borderWidth: 2,
    },
    subscriptionItem: {
      backgroundColor: colors.primary + "08",
      borderWidth: 1,
      borderColor: colors.primary + "30",
      borderStyle: "dashed",
      marginBottom: spacing.md,
    },
    categoryIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    subscriptionIcon: {
      backgroundColor: colors.primary + "15",
    },
    categoryItemName: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
    matchDot: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    saveButtonContainer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      borderRadius: 16,
      gap: spacing.sm,
    },
    saveButtonDisabled: {
      opacity: 0.4,
    },
    saveButtonText: {
      fontSize: 18,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    // Subscription Step Styles
    subscriptionStep: {
      width: SCREEN_WIDTH,
      flex: 1,
    },
    subscriptionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    subscriptionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    subscriptionContent: {
      flex: 1,
    },
    subscriptionScrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    inputGroup: {
      marginBottom: spacing.lg,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    subscriptionInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      gap: spacing.sm,
    },
    subscriptionInput: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
      paddingVertical: spacing.xs,
    },
    frequencyRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    frequencyButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
    },
    frequencyButtonActive: {
      backgroundColor: colors.primary,
    },
    frequencyButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    frequencyButtonTextActive: {
      color: "#FFFFFF",
    },
    horizontalCategoryScroll: {
      marginHorizontal: -spacing.md,
      paddingHorizontal: spacing.md,
    },
    categoryChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      backgroundColor: colors.surface,
      marginRight: spacing.sm,
      borderWidth: 1.5,
      borderColor: "transparent",
      gap: spacing.xs,
    },
    categoryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    categoryChipText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    estimateCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 12,
      gap: spacing.md,
    },
    estimateContent: {
      flex: 1,
    },
    estimateLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    estimateValue: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      marginTop: 2,
    },
  });

export default QuickAddModal;
