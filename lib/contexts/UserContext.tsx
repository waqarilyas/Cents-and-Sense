import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDatabase, UserProfile } from "../database";

const ONBOARDING_KEY = "@budget_app_onboarding_complete";
const USER_PROFILE_ID = "user_profile_001";

interface UserContextType {
  userName: string | null;
  defaultCurrency: string;
  isOnboardingComplete: boolean;
  loading: boolean;

  // Actions
  setUserProfile: (name: string, currency: string) => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  updateDefaultCurrency: (currency: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  getUserProfile: () => Promise<UserProfile | null>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<string>("USD");
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);

      // Check AsyncStorage first for quick check
      const onboardingStatus = await AsyncStorage.getItem(ONBOARDING_KEY);
      const isComplete = onboardingStatus === "true";

      if (!isComplete) {
        setIsOnboardingComplete(false);
        setLoading(false);
        return;
      }

      // Load full profile from database
      const db = await getDatabase();
      const profile = await db.getFirstAsync<UserProfile>(
        "SELECT * FROM user_profile WHERE id = ? LIMIT 1",
        [USER_PROFILE_ID],
      );

      if (profile) {
        setUserName(profile.name);
        setDefaultCurrency(profile.defaultCurrency);
        setIsOnboardingComplete(Boolean(profile.onboardingCompleted));
      } else {
        // Profile deleted but onboarding marked complete - reset
        await AsyncStorage.removeItem(ONBOARDING_KEY);
        setIsOnboardingComplete(false);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const setUserProfile = useCallback(async (name: string, currency: string) => {
    try {
      const db = await getDatabase();
      const now = Date.now();

      // Check if profile exists
      const existing = await db.getFirstAsync<UserProfile>(
        "SELECT * FROM user_profile WHERE id = ? LIMIT 1",
        [USER_PROFILE_ID],
      );

      if (existing) {
        // Update existing profile
        await db.runAsync(
          "UPDATE user_profile SET name = ?, defaultCurrency = ?, updatedAt = ? WHERE id = ?",
          [name, currency, now, USER_PROFILE_ID],
        );
      } else {
        // Create new profile
        await db.runAsync(
          "INSERT INTO user_profile (id, name, defaultCurrency, onboardingCompleted, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
          [USER_PROFILE_ID, name, currency, 0, now, now],
        );
      }

      // Update local state
      setUserName(name);
      setDefaultCurrency(currency);
    } catch (error) {
      console.error("Error setting user profile:", error);
      throw error;
    }
  }, []);

  const updateUserName = useCallback(async (name: string) => {
    try {
      const db = await getDatabase();
      const now = Date.now();

      await db.runAsync(
        "UPDATE user_profile SET name = ?, updatedAt = ? WHERE id = ?",
        [name, now, USER_PROFILE_ID],
      );

      setUserName(name);
    } catch (error) {
      console.error("Error updating user name:", error);
      throw error;
    }
  }, []);

  const updateDefaultCurrency = useCallback(async (currency: string) => {
    try {
      const db = await getDatabase();
      const now = Date.now();

      await db.runAsync(
        "UPDATE user_profile SET defaultCurrency = ?, updatedAt = ? WHERE id = ?",
        [currency, now, USER_PROFILE_ID],
      );

      setDefaultCurrency(currency);
    } catch (error) {
      console.error("Error updating default currency:", error);
      throw error;
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      const db = await getDatabase();
      const now = Date.now();

      // Mark onboarding as complete in database
      await db.runAsync(
        "UPDATE user_profile SET onboardingCompleted = ?, updatedAt = ? WHERE id = ?",
        [1, now, USER_PROFILE_ID],
      );

      // Mark in AsyncStorage for quick check
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");

      setIsOnboardingComplete(true);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      throw error;
    }
  }, []);

  const getUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const db = await getDatabase();
      const profile = await db.getFirstAsync<UserProfile>(
        "SELECT * FROM user_profile WHERE id = ? LIMIT 1",
        [USER_PROFILE_ID],
      );
      return profile || null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        userName,
        defaultCurrency,
        isOnboardingComplete,
        loading,
        setUserProfile,
        updateUserName,
        updateDefaultCurrency,
        completeOnboarding,
        getUserProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
