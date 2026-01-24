// Professional Design System for Budget Tracker App
import { useColorScheme } from "react-native";
import { useSettings } from "./contexts/SettingsContext";

export type ThemeMode = "light" | "dark" | "system";

export const lightColors = {
  // Primary palette
  primary: "#10B981", // Emerald green - main brand color
  primaryDark: "#059669",
  primaryLight: "#D1FAE5",

  // Accent colors
  accent: "#3B82F6", // Blue for secondary actions
  accentLight: "#DBEAFE",

  // Semantic colors
  success: "#22C55E",
  successLight: "#DCFCE7",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  error: "#EF4444",
  errorLight: "#FEE2E2",

  // Neutrals
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceSecondary: "#F1F5F9",

  // Text colors
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",

  // Borders
  border: "#E2E8F0",
  borderLight: "#F1F5F9",

  // Income/Expense specific
  income: "#22C55E",
  incomeLight: "#DCFCE7",
  expense: "#EF4444",
  expenseLight: "#FEE2E2",
} as const;

export const darkColors = {
  // Primary palette
  primary: "#34D399",
  primaryDark: "#10B981",
  primaryLight: "#1F2937",

  // Accent colors
  accent: "#60A5FA",
  accentLight: "#1E293B",

  // Semantic colors
  success: "#34D399",
  successLight: "#064E3B",
  warning: "#FBBF24",
  warningLight: "#78350F",
  error: "#FB7185",
  errorLight: "#7F1D1D",

  // Neutrals
  background: "#0B1120",
  surface: "#111827",
  surfaceSecondary: "#1F2937",

  // Text colors
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",

  // Borders
  border: "#1F2937",
  borderLight: "#334155",

  // Income/Expense specific
  income: "#34D399",
  incomeLight: "#064E3B",
  expense: "#FB7185",
  expenseLight: "#7F1D1D",
} as const;

export type ThemeColors = typeof lightColors | typeof darkColors;

export function useThemeColors() {
  const { settings, updateSetting } = useSettings();
  const systemScheme = useColorScheme();
  const theme = settings.theme;
  const activeTheme =
    theme === "system" ? (systemScheme === "dark" ? "dark" : "light") : theme;
  const colors = activeTheme === "dark" ? darkColors : lightColors;

  return {
    colors,
    theme,
    activeTheme,
    setTheme: (nextTheme: ThemeMode) => updateSetting("theme", nextTheme),
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  // Headings
  h1: { fontSize: 28, fontWeight: "700" as const, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: "700" as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
  h4: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24 },

  // Body text
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: "500" as const, lineHeight: 24 },
  bodySemibold: { fontSize: 16, fontWeight: "600" as const, lineHeight: 24 },

  // Small text
  small: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  smallMedium: { fontSize: 14, fontWeight: "500" as const, lineHeight: 20 },
  smallSemibold: { fontSize: 14, fontWeight: "600" as const, lineHeight: 20 },

  // Caption
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
  captionMedium: { fontSize: 12, fontWeight: "500" as const, lineHeight: 16 },

  // Large numbers
  largeNumber: { fontSize: 32, fontWeight: "700" as const, lineHeight: 40 },
  mediumNumber: { fontSize: 24, fontWeight: "700" as const, lineHeight: 32 },
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// Category icons and colors
export const categoryConfig = {
  food: { icon: "🍽️", color: "#F97316", name: "Food & Dining" },
  transport: { icon: "🚗", color: "#8B5CF6", name: "Transportation" },
  medicine: { icon: "💊", color: "#EC4899", name: "Healthcare" },
  groceries: { icon: "🛒", color: "#14B8A6", name: "Groceries" },
  rent: { icon: "🏠", color: "#6366F1", name: "Housing" },
  gifts: { icon: "🎁", color: "#F43F5E", name: "Gifts" },
  savings: { icon: "💰", color: "#10B981", name: "Savings" },
  entertainment: { icon: "🎬", color: "#A855F7", name: "Entertainment" },
  salary: { icon: "💵", color: "#22C55E", name: "Salary" },
  utilities: { icon: "💡", color: "#EAB308", name: "Utilities" },
  shopping: { icon: "🛍️", color: "#3B82F6", name: "Shopping" },
  investment: { icon: "📈", color: "#059669", name: "Investment" },
  other: { icon: "📋", color: "#64748B", name: "Other" },
  // Color palette for custom categories
  colors: [
    "#F97316",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#6366F1",
    "#F43F5E",
    "#10B981",
    "#A855F7",
    "#22C55E",
    "#EAB308",
    "#3B82F6",
    "#059669",
    "#64748B",
    "#EF4444",
    "#06B6D4",
  ],
} as const;

export const accountIcons = {
  checking: "🏦",
  savings: "💰",
  credit_card: "💳",
} as const;

// Utility function to format currency
import { getCurrency, formatCurrencyAmount } from "./currencies";

export const formatCurrency = (
  amount: number,
  currencyCode: string = "USD",
): string => {
  return formatCurrencyAmount(amount, currencyCode);
};

// Get currency symbol
export const getCurrencySymbol = (currencyCode: string = "USD"): string => {
  const currency = getCurrency(currencyCode);
  return currency?.symbol || currencyCode;
};

// Utility function to format date
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatShortDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};
