import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";
import { supabaseService } from "../services/SupabaseService";
import { billingService } from "../services/BillingService";
import { useFeatureFlags } from "./FeatureFlagsContext";

export type AuthState = "guest" | "authenticated" | "authenticated_premium";

interface AuthContextType {
  authState: AuthState;
  userId: string | null;
  email: string | null;
  loading: boolean;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveAuthStateFromEntitlements(
  premiumFlags: { pro_subscription?: boolean; pro_lifetime?: boolean } | null,
): AuthState {
  if (!premiumFlags) return "authenticated";
  return premiumFlags.pro_subscription || premiumFlags.pro_lifetime
    ? "authenticated_premium"
    : "authenticated";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const [authState, setAuthState] = useState<AuthState>("guest");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (session: { user: { id: string; email?: string } }) => {
    await billingService.logIn(session.user.id);
    const entitlements = await billingService.getEntitlements().catch(() => null);
    setAuthState(resolveAuthStateFromEntitlements(entitlements));
    setUserId(session.user.id);
    setEmail(session.user.email || null);
  }, []);

  const hydrate = useCallback(async () => {
    if (flagsLoading) return;
    if (!flags.authEnabled) {
      setAuthState("guest");
      setUserId(null);
      setEmail(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const session = await supabaseService.getSession();
      if (session?.user?.id) {
        await applySession(session);
      } else {
        setAuthState("guest");
        setUserId(null);
        setEmail(null);
      }
    } finally {
      setLoading(false);
    }
  }, [applySession, flags.authEnabled, flagsLoading]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (flagsLoading || !flags.authEnabled) {
      return;
    }

    const handleUrl = async (url: string) => {
      const session = await supabaseService.consumeAuthRedirect(url);
      if (session?.user?.id) {
        await applySession(session);
      }
    };

    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          return handleUrl(url);
        }
        return undefined;
      })
      .catch(() => undefined);

    const sub = Linking.addEventListener("url", (event) => {
      handleUrl(event.url).catch(() => undefined);
    });

    return () => sub.remove();
  }, [applySession, flags.authEnabled, flagsLoading]);

  const sendOtp = useCallback(async (value: string) => {
    if (!flags.authEnabled) {
      throw new Error("Sign-in is currently unavailable.");
    }
    await supabaseService.signInWithEmailOtp(value.trim().toLowerCase());
  }, [flags.authEnabled]);

  const verifyOtp = useCallback(async (value: string, token: string) => {
    if (!flags.authEnabled) {
      throw new Error("Sign-in is currently unavailable.");
    }
    const session = await supabaseService.verifyEmailOtp(
      value.trim().toLowerCase(),
      token.trim(),
    );
    await applySession({
      user: { id: session.user.id, email: session.user.email || value.trim().toLowerCase() },
    });
  }, [applySession, flags.authEnabled]);

  const continueAsGuest = useCallback(async () => {
    setAuthState("guest");
    setUserId(null);
    setEmail(null);
  }, []);

  const signOut = useCallback(async () => {
    if (!flags.authEnabled) {
      setAuthState("guest");
      setUserId(null);
      setEmail(null);
      return;
    }
    await Promise.all([supabaseService.signOut(), billingService.logOut()]);
    setAuthState("guest");
    setUserId(null);
    setEmail(null);
  }, [flags.authEnabled]);

  const value = useMemo(
    () => ({
      authState,
      userId,
      email,
      loading: flagsLoading || loading,
      sendOtp,
      verifyOtp,
      continueAsGuest,
      signOut,
    }),
    [authState, userId, email, flagsLoading, loading, sendOtp, verifyOtp, continueAsGuest, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
