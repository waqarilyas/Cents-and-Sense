import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Subscription processing modes
export type SubscriptionProcessingMode = "auto" | "manual" | "notify";

interface Settings {
  // Subscription settings
  subscriptionProcessingMode: SubscriptionProcessingMode;

  // Notification settings
  notificationsEnabled: boolean;
  subscriptionReminderDays: number;

  // Display settings
  defaultCurrencyCode: string;

  // Privacy
  hideBalances: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  subscriptionProcessingMode: "notify", // Default to notify - user gets choice
  notificationsEnabled: true,
  subscriptionReminderDays: 3,
  defaultCurrencyCode: "USD",
  hideBalances: false,
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

const SETTINGS_STORAGE_KEY = "@budget_tracker_settings";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge with defaults to handle new settings added in updates
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

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
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  const resetSettings = useCallback(async () => {
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
