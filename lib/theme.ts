// Professional Design System for Budget Tracker App
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { useSettings } from "./contexts/SettingsContext";
import {
  ACCENT_THEME_MAP,
  DEFAULT_ACCENT_THEME,
} from "./accentThemes";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  // Semantic colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;

  // Neutrals
  background: string;
  surface: string;
  surfaceSecondary: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders
  border: string;
  borderLight: string;

  // Income/Expense specific
  income: string;
  incomeLight: string;
  expense: string;
  expenseLight: string;

  // Overlays and shadows
  overlay: string;
  shadow: string;
}

const lightBaseColors: Omit<
  ThemeColors,
  "primary" | "primaryDark" | "primaryLight" | "accent" | "accentLight"
> = {
  success: "#15803D",
  successLight: "#DCFCE7",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  error: "#EF4444",
  errorLight: "#FEE2E2",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceSecondary: "#F1F5F9",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  income: "#15803D",
  incomeLight: "#DCFCE7",
  expense: "#EF4444",
  expenseLight: "#FEE2E2",
  overlay: "rgba(0, 0, 0, 0.5)",
  shadow: "#000000",
} as const;

const darkBaseColors: Omit<
  ThemeColors,
  "primary" | "primaryDark" | "primaryLight" | "accent" | "accentLight"
> = {
  success: "#4ADE80",
  successLight: "#14532D",
  warning: "#FBBF24",
  warningLight: "#78350F",
  error: "#FB7185",
  errorLight: "#7F1D1D",
  background: "#0B1120",
  surface: "#111827",
  surfaceSecondary: "#1F2937",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",
  border: "#1F2937",
  borderLight: "#334155",
  income: "#4ADE80",
  incomeLight: "#14532D",
  expense: "#FB7185",
  expenseLight: "#7F1D1D",
  overlay: "rgba(0, 0, 0, 0.7)",
  shadow: "#000000",
} as const;

export const lightColors: ThemeColors = {
  ...lightBaseColors,
  ...ACCENT_THEME_MAP[DEFAULT_ACCENT_THEME].light,
};

export const darkColors: ThemeColors = {
  ...darkBaseColors,
  ...ACCENT_THEME_MAP[DEFAULT_ACCENT_THEME].dark,
};

export function useThemeColors() {
  const { settings, updateSetting } = useSettings();
  const systemScheme = useColorScheme();
  const theme = settings.theme;
  const accentTheme = settings.accentTheme || DEFAULT_ACCENT_THEME;
  const activeTheme =
    theme === "system" ? (systemScheme === "dark" ? "dark" : "light") : theme;
  const accent = ACCENT_THEME_MAP[accentTheme] || ACCENT_THEME_MAP[DEFAULT_ACCENT_THEME];
  const colors: ThemeColors =
    activeTheme === "dark"
      ? { ...darkBaseColors, ...accent.dark }
      : { ...lightBaseColors, ...accent.light };

  return {
    colors,
    theme,
    accentTheme,
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
  food: {
    icon: "restaurant" as keyof typeof Ionicons.glyphMap,
    color: "#F97316",
    name: "Food & Dining",
  },
  transport: {
    icon: "car" as keyof typeof Ionicons.glyphMap,
    color: "#8B5CF6",
    name: "Transportation",
  },
  medicine: {
    icon: "medical" as keyof typeof Ionicons.glyphMap,
    color: "#EC4899",
    name: "Healthcare",
  },
  groceries: {
    icon: "cart" as keyof typeof Ionicons.glyphMap,
    color: "#14B8A6",
    name: "Groceries",
  },
  rent: {
    icon: "home" as keyof typeof Ionicons.glyphMap,
    color: "#6366F1",
    name: "Housing",
  },
  gifts: {
    icon: "gift" as keyof typeof Ionicons.glyphMap,
    color: "#F43F5E",
    name: "Gifts",
  },
  savings: {
    icon: "wallet" as keyof typeof Ionicons.glyphMap,
    color: "#10B981",
    name: "Savings",
  },
  entertainment: {
    icon: "film" as keyof typeof Ionicons.glyphMap,
    color: "#A855F7",
    name: "Entertainment",
  },
  salary: {
    icon: "cash" as keyof typeof Ionicons.glyphMap,
    color: "#22C55E",
    name: "Salary",
  },
  utilities: {
    icon: "flash" as keyof typeof Ionicons.glyphMap,
    color: "#EAB308",
    name: "Utilities",
  },
  shopping: {
    icon: "bag-handle" as keyof typeof Ionicons.glyphMap,
    color: "#3B82F6",
    name: "Shopping",
  },
  investment: {
    icon: "trending-up" as keyof typeof Ionicons.glyphMap,
    color: "#059669",
    name: "Investment",
  },
  other: {
    icon: "ellipsis-horizontal" as keyof typeof Ionicons.glyphMap,
    color: "#64748B",
    name: "Other",
  },
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
  checking: "business",
  savings: "wallet",
  credit_card: "card",
} as const;

// Utility function to format currency
import { getCurrency, formatCurrencyAmount } from "./currencies";

export const formatCurrency = (
  amount: number,
  currencyCode: string = "USD",
): string => {
  return formatCurrencyAmount(amount, currencyCode);
};

export const formatReadableCurrency = (
  amount: number,
  currencyCode: string = "USD",
): string => {
  return formatCurrencyAmount(amount, currencyCode, {
    compact: true,
    compactThreshold: 100000,
  });
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
