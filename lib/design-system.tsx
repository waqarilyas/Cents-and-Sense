// Design System Constants - Ensure consistency across all screens
import { Ionicons } from "@expo/vector-icons";

// Color Palette
export const COLORS = {
  PRIMARY: "#2563EB", // Brand blue
  PRIMARY_LIGHT: "#DBEAFE", // Soft blue background
  SECONDARY: "#0F766E", // Teal - Secondary emphasis
  WHITE: "#FFFFFF",
  TEXT_DARK: "#1a1a1a",
  TEXT_LIGHT: "#999999",
  TEXT_PLACEHOLDER: "#CCCCCC",
  BACKGROUND: "#E8F8F5",
  SURFACE: "#FFFFFF",

  // Status Colors
  SUCCESS: "#4CAF50",
  WARNING: "#FF9800",
  ERROR: "#D32F2F",
  INFO: "#2196F3",
} as const;

// Typography
export const TYPOGRAPHY = {
  HEADER_LARGE: { fontSize: 28, fontWeight: "700" as const },
  HEADER_MEDIUM: { fontSize: 20, fontWeight: "600" as const },
  HEADER_SMALL: { fontSize: 16, fontWeight: "600" as const },
  BODY_LARGE: { fontSize: 16, fontWeight: "400" as const },
  BODY_MEDIUM: { fontSize: 14, fontWeight: "400" as const },
  BODY_SMALL: { fontSize: 12, fontWeight: "400" as const },
  LABEL_LARGE: { fontSize: 14, fontWeight: "600" as const },
  LABEL_MEDIUM: { fontSize: 12, fontWeight: "600" as const },
  LABEL_SMALL: { fontSize: 11, fontWeight: "600" as const },
  CAPTION: { fontSize: 11, fontWeight: "400" as const },
} as const;

// Spacing
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 24,
  XXXL: 32,
} as const;

// Border Radius
export const BORDER_RADIUS = {
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  ROUND: 100,
} as const;

// Shadows
export const SHADOWS = {
  SM: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  MD: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  LG: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// Component Sizes
export const SIZES = {
  ICON_SM: 16,
  ICON_MD: 20,
  ICON_LG: 24,
  ICON_XL: 32,
  BUTTON_HEIGHT: 44,
  INPUT_HEIGHT: 48,
  AVATAR_SM: 40,
  AVATAR_MD: 48,
  AVATAR_LG: 80,
} as const;

// Category Icons
export const CATEGORY_ICONS: Record<
  string,
  keyof typeof Ionicons.glyphMap
> = {
  food: "restaurant",
  transport: "car",
  medicine: "medical",
  groceries: "cart",
  rent: "home",
  gifts: "gift",
  savings: "wallet",
  entertainment: "film",
  salary: "cash",
  others: "ellipsis-horizontal",
  income: "trending-up",
  expense: "trending-down",
};

// Tab Icons
export const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: "home",
  analytics: "stats-chart",
  transactions: "swap-vertical",
  categories: "pricetags",
  profile: "person-circle",
};
