import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "./theme";

export type AppIconVariant = "filled" | "outline";
export type AppIconSize = "inline" | "card" | "nav" | "hero";

export type AppIconName =
  | "home"
  | "history"
  | "more"
  | "accounts"
  | "budgets"
  | "goals"
  | "transactions"
  | "categories"
  | "subscriptions"
  | "analytics"
  | "settings"
  | "quickAdd"
  | "income"
  | "expense"
  | "success"
  | "warning"
  | "error"
  | "currency"
  | "guide"
  | "support"
  | "premium"
  | "sync"
  | "backup"
  | "restore"
  | "account"
  | "logout"
  | "bug"
  | "feature"
  | "opensource"
  | "contributors"
  | "info"
  | "privacy"
  | "document";

type Glyph = keyof typeof Ionicons.glyphMap;

const APP_ICON_MAP: Record<AppIconName, { filled: Glyph; outline: Glyph }> = {
  home: { filled: "home", outline: "home-outline" },
  history: { filled: "time", outline: "time-outline" },
  more: { filled: "grid", outline: "grid-outline" },
  accounts: { filled: "wallet", outline: "wallet-outline" },
  budgets: { filled: "pie-chart", outline: "pie-chart-outline" },
  goals: { filled: "flag", outline: "flag-outline" },
  transactions: {
    filled: "swap-vertical",
    outline: "swap-vertical-outline",
  },
  categories: { filled: "pricetags", outline: "pricetags-outline" },
  subscriptions: { filled: "repeat", outline: "repeat-outline" },
  analytics: {
    filled: "stats-chart",
    outline: "stats-chart-outline",
  },
  settings: { filled: "settings", outline: "settings-outline" },
  quickAdd: { filled: "add-circle", outline: "add-circle-outline" },
  income: { filled: "trending-up", outline: "trending-up-outline" },
  expense: { filled: "trending-down", outline: "trending-down-outline" },
  success: {
    filled: "checkmark-circle",
    outline: "checkmark-circle-outline",
  },
  warning: { filled: "alert-circle", outline: "alert-circle-outline" },
  error: { filled: "close-circle", outline: "close-circle-outline" },
  currency: { filled: "cash", outline: "cash-outline" },
  guide: { filled: "book", outline: "book-outline" },
  support: { filled: "help-circle", outline: "help-circle-outline" },
  premium: { filled: "diamond", outline: "diamond-outline" },
  sync: { filled: "sync", outline: "sync-outline" },
  backup: { filled: "cloud-upload", outline: "cloud-upload-outline" },
  restore: { filled: "cloud-download", outline: "cloud-download-outline" },
  account: { filled: "person-circle", outline: "person-circle-outline" },
  logout: { filled: "log-out", outline: "log-out-outline" },
  bug: { filled: "bug", outline: "bug-outline" },
  feature: { filled: "bulb", outline: "bulb-outline" },
  opensource: { filled: "code-slash", outline: "code-slash-outline" },
  contributors: { filled: "people", outline: "people-outline" },
  info: {
    filled: "information-circle",
    outline: "information-circle-outline",
  },
  privacy: {
    filled: "shield-checkmark",
    outline: "shield-checkmark-outline",
  },
  document: {
    filled: "document-text",
    outline: "document-text-outline",
  },
};

const APP_ICON_SIZES: Record<AppIconSize, number> = {
  inline: 16,
  card: 20,
  nav: 22,
  hero: 28,
};

export function getAppIconName(
  name: AppIconName,
  variant: AppIconVariant = "filled",
): Glyph {
  return APP_ICON_MAP[name][variant];
}

interface AppIconProps {
  name: AppIconName;
  variant?: AppIconVariant;
  size?: AppIconSize | number;
  color?: string;
}

export function AppIcon({
  name,
  variant = "filled",
  size = "card",
  color,
}: AppIconProps) {
  const { colors } = useThemeColors();
  const resolvedSize = typeof size === "number" ? size : APP_ICON_SIZES[size];

  return (
    <Ionicons
      name={getAppIconName(name, variant)}
      size={resolvedSize}
      color={color || colors.textPrimary}
    />
  );
}
