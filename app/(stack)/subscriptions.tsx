import { useCallback, useState, useMemo } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { Text } from "react-native-paper";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSubscriptions } from "../../lib/contexts/SubscriptionContext";
import { useCategories } from "../../lib/contexts/CategoryContext";
import { useUser } from "../../lib/contexts/UserContext";
import { CurrencySelector } from "../../lib/components/CurrencyPicker";
import {
  spacing,
  borderRadius,
  formatCurrency,
  useThemeColors,
  ThemeColors,
} from "../../lib/theme";
import { Card, LoadingState } from "../../lib/components";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

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

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export default function SubscriptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { defaultCurrency } = useUser();
  const [subCurrency, setSubCurrency] = useState(defaultCurrency);
  const {
    subscriptions,
    activeSubscriptions,
    loading,
    refreshSubscriptions,
    addSubscription,
    deleteSubscription,
    toggleSubscription,
    getMonthlyTotal,
    getUpcomingSubscriptions,
  } = useSubscriptions();
  const { expenseCategories, getCategory } = useCategories();

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("monthly");
  const [notes, setNotes] = useState("");

  const monthlyTotal = getMonthlyTotal();
  const upcomingThisWeek = getUpcomingSubscriptions(7);

  useFocusEffect(
    useCallback(() => {
      refreshSubscriptions();
    }, [refreshSubscriptions]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSubscriptions();
    setRefreshing(false);
  }, [refreshSubscriptions]);

  const hapticFeedback = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  const formatDueDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const resetForm = () => {
    setName("");
    setAmount("");
    setCategoryId(expenseCategories[0]?.id || "");
    setFrequency("monthly");
    setNotes("");
    setSubCurrency(defaultCurrency);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setCategoryId(expenseCategories[0]?.id || "");
    setModalVisible(true);
    hapticFeedback();
  };

  const handleSave = async () => {
    const amountNum = parseFloat(amount);
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a subscription name");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    if (!categoryId) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    try {
      await addSubscription(
        name.trim(),
        amountNum,
        categoryId,
        frequency,
        Date.now(),
        subCurrency,
        3,
        notes.trim() || undefined,
      );

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert("Error", "Failed to save subscription");
    }
  };

  const handleDelete = (id: string, subName: string) => {
    Alert.alert(
      "Delete Subscription",
      `Are you sure you want to delete "${subName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSubscription(id);
            hapticFeedback();
          },
        },
      ],
    );
  };

  const handleToggle = async (id: string) => {
    await toggleSubscription(id);
    hapticFeedback();
  };

  if (loading) {
    return <LoadingState />;
  }

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "About Subscriptions",
                "Track recurring payments automatically.\\n\\n" +
                  "\u2022 Daily/Weekly/Monthly/Yearly frequencies\n" +
                  "\u2022 Auto-renewal reminders\n" +
                  "\u2022 Approve renewals before they're charged\n" +
                  "\u2022 Track total monthly subscription cost\n\n" +
                  "Pending subscriptions need your approval!",
                [{ text: "Got it!" }],
              )
            }
          >
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Monthly Cost</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(monthlyTotal)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Active</Text>
              <Text style={styles.summaryValue}>
                {activeSubscriptions.length}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>This Week</Text>
              <Text style={styles.summaryValue}>{upcomingThisWeek.length}</Text>
            </View>
          </View>
        </Card>

        {/* Upcoming Section */}
        {upcomingThisWeek.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Due This Week</Text>
            {upcomingThisWeek.map((sub) => {
              const category = getCategory(sub.categoryId);
              return (
                <Card key={sub.id} style={styles.subscriptionCard}>
                  <View style={styles.subscriptionRow}>
                    <View
                      style={[
                        styles.subscriptionIcon,
                        { backgroundColor: colors.warning + "20" },
                      ]}
                    >
                      <Ionicons
                        name={getSubscriptionIcon(sub.name)}
                        size={24}
                        color={colors.warning}
                      />
                    </View>
                    <View style={styles.subscriptionInfo}>
                      <Text style={styles.subscriptionName}>{sub.name}</Text>
                      <Text style={styles.subscriptionDue}>
                        {formatDueDate(sub.nextDueDate)}
                      </Text>
                    </View>
                    <Text style={styles.subscriptionAmount}>
                      {formatCurrency(sub.amount, sub.currency)}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* All Subscriptions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Subscriptions</Text>

          {subscriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="repeat-outline"
                size={64}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>No Subscriptions</Text>
              <Text style={styles.emptyDescription}>
                Add your recurring expenses like Netflix, Spotify, or rent
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={openAddModal}
              >
                <Ionicons name="add" size={20} color={colors.textInverse} />
                <Text style={styles.emptyButtonText}>Add Subscription</Text>
              </TouchableOpacity>
            </View>
          ) : (
            subscriptions.map((sub) => {
              const category = getCategory(sub.categoryId);
              return (
                <Card
                  key={sub.id}
                  style={[
                    styles.subscriptionCard,
                    !sub.isActive && styles.subscriptionInactive,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.subscriptionRow}
                    onLongPress={() => handleDelete(sub.id, sub.name)}
                    delayLongPress={500}
                  >
                    <View
                      style={[
                        styles.subscriptionIcon,
                        {
                          backgroundColor:
                            (sub.isActive
                              ? category?.color || colors.primary
                              : colors.textMuted) + "20",
                        },
                      ]}
                    >
                      <Ionicons
                        name={getSubscriptionIcon(sub.name)}
                        size={24}
                        color={
                          sub.isActive
                            ? category?.color || colors.primary
                            : colors.textMuted
                        }
                      />
                    </View>
                    <View style={styles.subscriptionInfo}>
                      <Text
                        style={[
                          styles.subscriptionName,
                          !sub.isActive && styles.textInactive,
                        ]}
                      >
                        {sub.name}
                      </Text>
                      <Text style={styles.subscriptionMeta}>
                        {FREQUENCY_LABELS[sub.frequency]} •{" "}
                        {formatDueDate(sub.nextDueDate)}
                      </Text>
                    </View>
                    <View style={styles.subscriptionRight}>
                      <Text
                        style={[
                          styles.subscriptionAmount,
                          !sub.isActive && styles.textInactive,
                        ]}
                      >
                        {formatCurrency(sub.amount, sub.currency)}
                      </Text>
                      <Switch
                        value={sub.isActive}
                        onValueChange={() => handleToggle(sub.id)}
                        trackColor={{
                          false: colors.border,
                          true: colors.primaryLight,
                        }}
                        thumbColor={
                          sub.isActive ? colors.primary : colors.textMuted
                        }
                      />
                    </View>
                  </TouchableOpacity>
                </Card>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Subscription</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Netflix, Spotify, Gym"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Frequency Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.frequencyRow}>
                {(["weekly", "monthly", "yearly"] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      frequency === freq && styles.frequencyButtonActive,
                    ]}
                    onPress={() => {
                      hapticFeedback();
                      setFrequency(freq);
                    }}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        frequency === freq && styles.frequencyButtonTextActive,
                      ]}
                    >
                      {FREQUENCY_LABELS[freq]}
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
                style={styles.categoryScroll}
              >
                {expenseCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      categoryId === cat.id && {
                        backgroundColor: cat.color + "30",
                        borderColor: cat.color,
                      },
                    ]}
                    onPress={() => {
                      hapticFeedback();
                      setCategoryId(cat.id);
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
                        categoryId === cat.id && { color: cat.color },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Currency Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Currency</Text>
              <CurrencySelector selectedCode={subCurrency} onPress={() => {}} />
            </View>

            {/* Notes Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Any additional notes..."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
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
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    backButton: {
      padding: spacing.xs,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    addButton: {
      padding: spacing.xs,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
    },
    summaryCard: {
      marginBottom: spacing.lg,
      backgroundColor: colors.primary,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    summaryItem: {
      flex: 1,
      alignItems: "center",
    },
    summaryLabel: {
      fontSize: 12,
      color: "rgba(255,255,255,0.8)",
      marginBottom: spacing.xs,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    summaryDivider: {
      width: 1,
      height: 40,
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    subscriptionCard: {
      marginBottom: spacing.sm,
    },
    subscriptionInactive: {
      opacity: 0.6,
    },
    subscriptionRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    subscriptionIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    subscriptionInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    subscriptionName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    subscriptionDue: {
      fontSize: 13,
      color: colors.warning,
      fontWeight: "500",
      marginTop: 2,
    },
    subscriptionMeta: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    subscriptionRight: {
      alignItems: "flex-end",
      gap: spacing.xs,
    },
    subscriptionAmount: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.expense,
    },
    textInactive: {
      color: colors.textMuted,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: spacing.xxxl,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.textPrimary,
      marginTop: spacing.lg,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: "center",
      paddingHorizontal: spacing.xl,
    },
    emptyButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 12,
      marginTop: spacing.xl,
      gap: spacing.xs,
    },
    emptyButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    saveButton: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    modalContent: {
      flex: 1,
      padding: spacing.lg,
    },
    inputGroup: {
      marginBottom: spacing.xl,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    frequencyRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    frequencyButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: 10,
      backgroundColor: colors.surface,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    frequencyButtonActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    frequencyButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    frequencyButtonTextActive: {
      color: colors.primary,
    },
    categoryScroll: {
      marginHorizontal: -spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    categoryChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      backgroundColor: colors.surface,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: spacing.xs,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textPrimary,
    },
  });
