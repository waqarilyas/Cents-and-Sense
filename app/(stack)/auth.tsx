import { useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors, ThemeColors, spacing, borderRadius } from "../../lib/theme";
import { useAuth } from "../../lib/contexts/AuthContext";

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pendingPlan?: string }>();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sendOtp, verifyOtp, continueAsGuest } = useAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    if (!email.trim()) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await sendOtp(email);
      setStep("verify");
      Alert.alert(
        "Check your email",
        "Enter the OTP code from your email. If you requested multiple codes, only the latest one works.",
      );
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof Error ? e.message : "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!code.trim()) {
      Alert.alert("Code required", "Please enter the OTP code.");
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email, code);
      Alert.alert("Signed In", "Now complete your profile setup.");
      router.replace({
        pathname: "/(stack)/profile-setup",
        params: params.pendingPlan
          ? { pendingPlan: params.pendingPlan }
          : {},
      });
    } catch (e) {
      Alert.alert("Verification failed", e instanceof Error ? e.message : "Unable to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Sign In</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Sign in to restore premium on any device and prepare account sync.
          Cloud sync activates after you subscribe to a Premium plan.
          OTP codes are one-time use and expire quickly.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          editable={!loading && step === "email"}
        />

        {step === "verify" && (
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Enter OTP code"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            editable={!loading}
          />
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          disabled={loading}
          onPress={step === "email" ? onSend : onVerify}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Please wait..." : step === "email" ? "Send OTP" : "Verify & Sign In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          disabled={loading}
          onPress={async () => {
            await continueAsGuest();
            router.back();
          }}
        >
          <Text style={styles.secondaryButtonText}>Continue as Guest</Text>
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
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 56,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
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
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      gap: spacing.md,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      color: colors.textPrimary,
      fontSize: 16,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 16,
    },
    secondaryButton: {
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontWeight: "600",
      fontSize: 15,
    },
  });
