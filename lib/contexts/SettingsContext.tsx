import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AccentThemeId,
  DEFAULT_ACCENT_THEME,
} from "../accentThemes";

// Subscription processing modes
export type SubscriptionProcessingMode = "auto" | "manual" | "notify";
export type ThemeMode = "light" | "dark" | "system";

export interface Settings {
  // Subscription settings
  subscriptionProcessingMode: SubscriptionProcessingMode;

  // Notification settings
  notificationsEnabled: boolean;
  subscriptionReminderDays: number;

  // Display settings
  defaultCurrencyCode: string;

  // Appearance
  theme: ThemeMode;
  accentTheme: AccentThemeId;

  // Privacy
  hideBalances: boolean;

  // Budget settings (YNAB-style)
  budgetPeriodStartDay: number; // 1-28, day of month when budget period starts
  enableBudgetCarryover: boolean; // Allow unused budget to roll over
}

export const DEFAULT_SETTINGS: Settings = {
  subscriptionProcessingMode: "notify", // Default to notify - user gets choice
  notificationsEnabled: true,
  subscriptionReminderDays: 3,
  defaultCurrencyCode: "USD",
  hideBalances: false,
  theme: "system",
  accentTheme: DEFAULT_ACCENT_THEME,
  budgetPeriodStartDay: 1, // Start on 1st of month by default
  enableBudgetCarryover: true, // Enable YNAB-style carryover by default
};

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  updateSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SETTINGS_STORAGE_KEY = "@budget_tracker_settings";

export async function loadStoredSettings(): Promise<Settings> {
  const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...JSON.parse(stored),
  };
}

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings?: Settings;
}) {
  const [settings, setSettings] = useState<Settings>(
    initialSettings ?? DEFAULT_SETTINGS,
  );
  const [loading, setLoading] = useState(!initialSettings);
  const settingsRef = useRef<Settings>(initialSettings ?? DEFAULT_SETTINGS);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    if (initialSettings) {
      const hydratedSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
      settingsRef.current = hydratedSettings;
      setSettings(hydratedSettings);
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const storedSettings = await loadStoredSettings();
        settingsRef.current = storedSettings;
        setSettings(storedSettings);
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [initialSettings]);

  // Save settings to AsyncStorage whenever they change
  const saveSettings = useCallback(async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(newSettings),
      );
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }, []);

  const updateSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const newSettings = { ...settingsRef.current, [key]: value };
      settingsRef.current = newSettings;
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [saveSettings],
  );

  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      const newSettings = { ...settingsRef.current, ...updates };
      settingsRef.current = newSettings;
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [saveSettings],
  );

  const resetSettings = useCallback(async () => {
    settingsRef.current = DEFAULT_SETTINGS;
    setSettings(DEFAULT_SETTINGS);
    await saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSetting,
        updateSettings,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
