import { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, ThemeColors, spacing, borderRadius } from "../../lib/theme";
import { Card } from "../../lib/components";
import { useSync, SyncSetupStrategy } from "../../lib/contexts/SyncContext";
import { useEntitlements } from "../../lib/contexts/EntitlementContext";

type Strategy = Exclude<SyncSetupStrategy, "skip">;

const STRATEGY_LABELS: Record<Strategy, string> = {
  merge: "Merge Local + Cloud",
  local_to_cloud: "Use Local (Upload to Cloud)",
  cloud_to_local: "Use Cloud (Replace Local)",
};

export default function SyncSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ pendingPlan?: string }>();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { getSyncReadiness, runSyncSetup } = useSync();
  const { isPremium } = useEntitlements();

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [readiness, setReadiness] = useState<Awaited<ReturnType<typeof getSyncReadiness>> | null>(null);
  const [selected, setSelected] = useState<Strategy>("merge");

  const loadReadiness = async () => {
    try {
      setLoading(true);
      const snapshot = await getSyncReadiness();
      setReadiness(snapshot);
      setSelected(snapshot.recommendation);
    } catch (error) {
      Alert.alert(
        "Sync Setup Error",
        error instanceof Error ? error.message : "Unable to load sync readiness.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }
    loadReadiness().catch(() => undefined);
  }, [isPremium]);

  if (!isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sync Setup</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.subtle}>Cloud sync is available on Premium plans only.</Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: spacing.md, width: "100%" }]}
            onPress={() => router.replace("/(stack)/paywall")}
          >
            <Text style={styles.primaryButtonText}>View Premium Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const navigateNext = () => {
    if (params.pendingPlan) {
      router.replace({
        pathname: "/(stack)/paywall",
        params: { pendingPlan: params.pendingPlan },
      });
      return;
    }
    router.replace("/(tabs)");
  };

  const executeApply = async () => {
    if (!readiness) return;
    setApplying(true);
    try {
      const summary = await runSyncSetup(selected);
      Alert.alert(
        "Sync Complete",
        `Mode: ${STRATEGY_LABELS[selected]}\nPushed: ${summary.totalPushed}\nPulled: ${summary.totalPulled}\nConflicts resolved: ${summary.totalConflicts}${summary.safetyBackupUri ? "\nSafety backup created." : ""}`,
      );
      navigateNext();
    } catch (error) {
      Alert.alert(
        "Sync Failed",
        error instanceof Error ? error.message : "Unable to complete sync setup.",
      );
    } finally {
      setApplying(false);
    }
  };

  const onApply = async () => {
    if (selected === "cloud_to_local") {
      Alert.alert(
        "Replace Local Data?",
        "This will replace local data with cloud data. A safety backup will be created first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: () => executeApply() },
        ],
      );
      return;
    }

    if (selected === "local_to_cloud") {
      Alert.alert(
        "Upload Local Data to Cloud?",
        "This will use current local data as source of truth in cloud.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: () => executeApply() },
        ],
      );
      return;
    }

    await executeApply();
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sync Setup</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.subtle}>Analyzing local and cloud data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Sync Strategy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Data Snapshot</Text>
          <Text style={styles.summaryText}>Local records: {readiness?.localTotal ?? 0}</Text>
          <Text style={styles.summaryText}>Cloud records: {readiness?.cloudTotal ?? 0}</Text>
          <Text style={styles.summaryText}>Potential conflicts: {readiness?.conflictsTotal ?? 0}</Text>
          <Text style={[styles.summaryText, { marginTop: spacing.xs }]}>
            Recommended: {readiness ? STRATEGY_LABELS[readiness.recommendation] : "-"}
          </Text>
          {readiness?.tables.map((table) => (
            <Text key={table.table} style={styles.tableStatText}>
              {table.table}: local {table.localCount}, cloud {table.cloudCount}, conflicts {table.conflicts}
            </Text>
          ))}
        </Card>

        {(Object.keys(STRATEGY_LABELS) as Strategy[]).map((strategy) => {
          const active = selected === strategy;
          return (
            <TouchableOpacity
              key={strategy}
              style={[
                styles.optionCard,
                { borderColor: active ? colors.primary : colors.border },
              ]}
              onPress={() => setSelected(strategy)}
            >
              <View style={styles.optionRow}>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{STRATEGY_LABELS[strategy]}</Text>
                  <Text style={styles.optionSubtitle}>
                    {strategy === "merge"
                      ? "Safest default. Keeps latest changes from both sides."
                      : strategy === "local_to_cloud"
                      ? "Use this device as source of truth and upload to cloud."
                      : "Replace local dataset with existing cloud data."}
                  </Text>
                </View>
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color={active ? colors.primary : colors.textMuted}
                />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={navigateNext}
            disabled={applying}
          >
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={onApply}
            disabled={applying}
          >
            <Text style={styles.primaryButtonText}>
              {applying ? "Applying..." : "Apply & Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
    },
    header: {
      paddingVertical: spacing.md,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    subtle: {
      color: colors.textMuted,
      fontSize: 14,
    },
    content: {
      gap: spacing.md,
      paddingBottom: spacing.xl,
    },
    summaryCard: {
      padding: spacing.lg,
      gap: spacing.xs,
    },
    summaryTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: spacing.xs,
    },
    summaryText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    tableStatText: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    optionCard: {
      borderWidth: 1,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
    },
    optionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md,
    },
    optionTextWrap: {
      flex: 1,
      gap: 4,
    },
    optionTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    optionSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    actions: {
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontWeight: "600",
    },
    primaryButton: {
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
  });
