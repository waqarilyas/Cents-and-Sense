import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeMode;
  activeTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => Promise<void>;
  colors: typeof lightColors;
}

export const lightColors = {
  background: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceVariant: "#EEF2F6",
  primary: "#6366F1",
  primaryLight: "#818CF8",
  secondary: "#14B8A6",
  accent: "#EC4899",
  error: "#F43F5E",
  success: "#10B981",
  warning: "#F59E0B",
  text: "#0F172A",
  textSecondary: "#475569",
  textTertiary: "#94A3B8",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  shadow: "rgba(0, 0, 0, 0.08)",
  income: "#10B981",
  expense: "#F43F5E",
  card: "#FFFFFF",
  overlay: "rgba(0, 0, 0, 0.5)",
};

export const darkColors = {
  background: "#0B1120",
  surface: "#1E293B",
  surfaceVariant: "#334155",
  primary: "#818CF8",
  primaryLight: "#A5B4FC",
  secondary: "#2DD4BF",
  accent: "#F472B6",
  error: "#FB7185",
  success: "#34D399",
  warning: "#FBBF24",
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textTertiary: "#94A3B8",
  border: "#334155",
  borderLight: "#475569",
  shadow: "rgba(0, 0, 0, 0.4)",
  income: "#34D399",
  expense: "#FB7185",
  card: "#1E293B",
  overlay: "rgba(0, 0, 0, 0.75)",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">(
    systemColorScheme === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (theme === "system") {
      setActiveTheme(systemColorScheme === "dark" ? "dark" : "light");
    } else {
      setActiveTheme(theme);
    }
  }, [theme, systemColorScheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme) {
        setThemeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem("theme", newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const colors = activeTheme === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, activeTheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
