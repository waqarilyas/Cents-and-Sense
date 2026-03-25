import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabaseService } from "../services/SupabaseService";
import { billingService } from "../services/BillingService";

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
  const [authState, setAuthState] = useState<AuthState>("guest");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      const session = await supabaseService.getSession();
      if (session?.user?.id) {
        await billingService.logIn(session.user.id);
        const entitlements = await billingService.getEntitlements().catch(() => null);
        setAuthState(resolveAuthStateFromEntitlements(entitlements));
        setUserId(session.user.id);
        setEmail(session.user.email || null);
      } else {
        setAuthState("guest");
        setUserId(null);
        setEmail(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const sendOtp = useCallback(async (value: string) => {
    await supabaseService.signInWithEmailOtp(value.trim().toLowerCase());
  }, []);

  const verifyOtp = useCallback(async (value: string, token: string) => {
    const session = await supabaseService.verifyEmailOtp(
      value.trim().toLowerCase(),
      token.trim(),
    );
    await billingService.logIn(session.user.id);
    const entitlements = await billingService.getEntitlements().catch(() => null);
    setAuthState(resolveAuthStateFromEntitlements(entitlements));
    setUserId(session.user.id);
    setEmail(session.user.email || value.trim().toLowerCase());
  }, []);

  const continueAsGuest = useCallback(async () => {
    setAuthState("guest");
    setUserId(null);
    setEmail(null);
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([supabaseService.signOut(), billingService.logOut()]);
    setAuthState("guest");
    setUserId(null);
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({
      authState,
      userId,
      email,
      loading,
      sendOtp,
      verifyOtp,
      continueAsGuest,
      signOut,
    }),
    [authState, userId, email, loading, sendOtp, verifyOtp, continueAsGuest, signOut],
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
