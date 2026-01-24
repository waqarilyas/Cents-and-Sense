import { useState } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../../lib/contexts/SettingsContext";
import { useBudgets } from "../../lib/contexts/BudgetContext";
import {
  spacing,
  borderRadius,
  useThemeColors,
  ThemeColors,
} from "../../lib/theme";
import {
  getCurrentPeriod,
  formatPeriod,
  getDaysRemainingInPeriod,
} from "../../lib/utils/periodCalculations";
import { Card, Button, Input } from "../../lib/components";

export default function BudgetSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = createStyles(colors);
  const { settings, updateSetting } = useSettings();
  const { processPeriodTransitions } = useBudgets();

  const [periodStartDay, setPeriodStartDay] = useState(
    settings.budgetPeriodStartDay.toString(),
  );
  const [saving, setSaving] = useState(false);

  const currentPeriod = getCurrentPeriod(settings.budgetPeriodStartDay);
  const daysRemaining = getDaysRemainingInPeriod(settings.budgetPeriodStartDay);

  const handleSavePeriodStartDay = async () => {
    const day = parseInt(periodStartDay);

    if (isNaN(day) || day < 1 || day > 28) {
      Alert.alert("Invalid Day", "Please enter a day between 1 and 28");
      return;
    }

    if (day === settings.budgetPeriodStartDay) {
      return; // No change
    }

    Alert.alert(
      "Change Budget Period?",
      `This will change your budget period to start on day ${day} of each month. Your current budget data will be preserved, but period calculations will adjust.\n\nContinue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          onPress: async () => {
            setSaving(true);
            try {
              await updateSetting("budgetPeriodStartDay", day);
              await processPeriodTransitions();
              Alert.alert("Success", "Budget period updated successfully!");
            } catch (error) {
              Alert.alert("Error", "Failed to update budget period");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleToggleCarryover = async (enabled: boolean) => {
    const message = enabled
      ? "Enable budget carryover? Unused budget from each period will automatically roll over to the next period."
      : "Disable budget carryover? Each budget period will start fresh with your set budget amount.";

    Alert.alert(enabled ? "Enable Carryover" : "Disable Carryover", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: enabled ? "Enable" : "Disable",
        onPress: async () => {
          try {
            await updateSetting("enableBudgetCarryover", enabled);
          } catch (error) {
            Alert.alert("Error", "Failed to update carryover setting");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budget Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Current Period Info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.infoTitle}>Current Budget Period</Text>
          </View>
          <Text style={styles.periodText}>{formatPeriod(currentPeriod)}</Text>
          <Text style={styles.daysText}>{daysRemaining} days remaining</Text>
        </Card>

        {/* Period Start Day Setting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Period</Text>
          <Text style={styles.sectionDescription}>
            Choose what day of the month your budget period should start. This
            is useful if you get paid mid-month (e.g., on the 15th).
          </Text>

          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Period Starts On</Text>
                <Text style={styles.settingHint}>Day of each month (1-28)</Text>
              </View>
              <View style={styles.dayInputContainer}>
                <Input
                  value={periodStartDay}
                  onChangeText={setPeriodStartDay}
                  keyboardType="numeric"
                />
              </View>
            </View>
            {periodStartDay !== settings.budgetPeriodStartDay.toString() && (
              <Button
                title={saving ? "Saving..." : "Save Changes"}
                onPress={handleSavePeriodStartDay}
                disabled={saving}
                loading={saving}
                fullWidth
                style={{ marginTop: spacing.md }}
              />
            )}
          </Card>

          {/* Example */}
          <Card style={styles.exampleCard}>
            <View style={styles.exampleHeader}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.exampleTitle}>Example</Text>
            </View>
            <Text style={styles.exampleText}>
              If you set day{" "}
              <Text style={styles.bold}>{periodStartDay || "1"}</Text>, your
              budget periods will be:
            </Text>
            <Text style={styles.examplePeriod}>
              • {formatPeriod(getCurrentPeriod(parseInt(periodStartDay) || 1))}
            </Text>
          </Card>
        </View>

        {/* Carryover Setting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Carryover</Text>
          <Text style={styles.sectionDescription}>
            YNAB-style budgeting: Unused budget automatically rolls over to the
            next period. Overspending reduces next period's available amount.
          </Text>

          <Card style={styles.settingCard}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() =>
                handleToggleCarryover(!settings.enableBudgetCarryover)
              }
            >
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Enable Budget Carryover</Text>
                <Text style={styles.toggleHint}>
                  {settings.enableBudgetCarryover
                    ? "Unused budget rolls to next period"
                    : "Each period starts fresh"}
                </Text>
              </View>
              <View
                style={[
                  styles.toggle,
                  settings.enableBudgetCarryover && styles.toggleActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    settings.enableBudgetCarryover && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
          </Card>

          {/* Carryover Example */}
          <Card style={styles.exampleCard}>
            <View style={styles.exampleHeader}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.exampleTitle}>How It Works</Text>
            </View>
            <Text style={styles.exampleText}>
              <Text style={styles.bold}>With Carryover Enabled:</Text>
            </Text>
            <Text style={styles.exampleItem}>
              ✓ Budget: $500, Spent: $450 → Carryover: +$50
            </Text>
            <Text style={styles.exampleItem}>
              ✓ Next period available: $550
            </Text>
            <Text style={[styles.exampleItem, { marginTop: spacing.sm }]}>
              ⚠️ Budget: $500, Spent: $550 → Carryover: -$50
            </Text>
            <Text style={styles.exampleItem}>
              ⚠️ Next period available: $450
            </Text>
          </Card>
        </View>

        {/* Help Text */}
        <Card
          style={[styles.infoCard, { backgroundColor: colors.primaryLight }]}
        >
          <View style={styles.helpRow}>
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={colors.primary}
            />
            <View style={styles.helpText}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpDescription}>
                Budget carryover helps you track your actual spending behavior
                across periods, rewarding underspending and highlighting
                overspending.
              </Text>
            </View>
          </View>
        </Card>
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
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: spacing.xs,
      marginLeft: -spacing.xs,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    infoCard: {
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    infoHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginLeft: spacing.sm,
    },
    periodText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    daysText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    sectionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    settingCard: {
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    settingHint: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    dayInputContainer: {
      width: 70,
      marginLeft: spacing.md,
    },
    dayInput: {
      textAlign: "center",
      fontSize: 18,
      fontWeight: "700",
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    toggleInfo: {
      flex: 1,
    },
    toggleLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    toggleHint: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    toggle: {
      width: 50,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.border,
      padding: 2,
      justifyContent: "center",
    },
    toggleActive: {
      backgroundColor: colors.primary,
    },
    toggleThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    toggleThumbActive: {
      alignSelf: "flex-end",
    },
    exampleCard: {
      padding: spacing.md,
      backgroundColor: colors.surface,
    },
    exampleHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    exampleTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      marginLeft: spacing.xs,
    },
    exampleText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    examplePeriod: {
      fontSize: 14,
      color: colors.textPrimary,
      marginTop: spacing.xs,
      marginLeft: spacing.sm,
    },
    exampleItem: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
      marginLeft: spacing.sm,
    },
    bold: {
      fontWeight: "700",
      color: colors.textPrimary,
    },
    helpRow: {
      flexDirection: "row",
    },
    helpText: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    helpTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      marginBottom: spacing.xs,
    },
    helpDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
