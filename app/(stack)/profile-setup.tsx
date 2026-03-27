import { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, ThemeColors, spacing, borderRadius } from "../../lib/theme";
import { useUser } from "../../lib/contexts/UserContext";
import { useCurrency } from "../../lib/contexts/CurrencyContext";
import { useSync } from "../../lib/contexts/SyncContext";
import { useEntitlements } from "../../lib/contexts/EntitlementContext";
import { CurrencyDropdown } from "../../lib/components/CurrencyPicker";

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ pendingPlan?: string }>();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { userName, defaultCurrency, setUserProfile, updateDefaultCurrency } = useUser();
  const { setDefaultCurrency } = useCurrency();
  const { syncProfileNow } = useSync();
  const { isPremium } = useEntitlements();

  const [name, setName] = useState(userName || "");
  const [currency, setCurrency] = useState(defaultCurrency || "USD");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name Required", "Please enter your name.");
      return;
    }

    setSaving(true);
    try {
      await setUserProfile(trimmed, currency);
      await Promise.all([setDefaultCurrency(currency), updateDefaultCurrency(currency)]);

      if (isPremium) {
        await syncProfileNow().catch(() => undefined);
      }

      if (params.pendingPlan) {
        router.replace({
          pathname: "/(stack)/paywall",
          params: { pendingPlan: params.pendingPlan },
        });
        return;
      }

      if (isPremium) {
        router.replace("/(stack)/sync-setup");
        return;
      }

      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Setup Failed",
        error instanceof Error ? error.message : "Unable to save profile settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Up Your Profile</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Save your name and default currency so your account stays personalized across devices.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!saving}
        />

        <CurrencyDropdown
          selectedCode={currency}
          onSelect={setCurrency}
          label="Default Currency"
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? "Saving..." : "Save & Continue"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
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
      fontSize: 22,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    content: {
      gap: spacing.md,
      paddingTop: spacing.md,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
    },
    button: {
      marginTop: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
  });
