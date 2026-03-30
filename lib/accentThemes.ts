export type AccentThemeId =
  | "ocean"
  | "teal"
  | "indigo"
  | "rose"
  | "amber"
  | "graphite";

export interface AccentPalette {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
}

export interface AccentThemeOption {
  id: AccentThemeId;
  label: string;
  description: string;
  light: AccentPalette;
  dark: AccentPalette;
}

export const DEFAULT_ACCENT_THEME: AccentThemeId = "teal";

export const ACCENT_THEME_OPTIONS: AccentThemeOption[] = [
  {
    id: "ocean",
    label: "Ocean",
    description: "Clean blue with deep teal accents",
    light: {
      primary: "#2563EB",
      primaryDark: "#1D4ED8",
      primaryLight: "#DBEAFE",
      accent: "#0F766E",
      accentLight: "#CCFBF1",
    },
    dark: {
      primary: "#60A5FA",
      primaryDark: "#3B82F6",
      primaryLight: "#172554",
      accent: "#2DD4BF",
      accentLight: "#134E4A",
    },
  },
  {
    id: "teal",
    label: "Teal",
    description: "Modern teal with cool cyan support",
    light: {
      primary: "#0F766E",
      primaryDark: "#115E59",
      primaryLight: "#CCFBF1",
      accent: "#0284C7",
      accentLight: "#E0F2FE",
    },
    dark: {
      primary: "#2DD4BF",
      primaryDark: "#14B8A6",
      primaryLight: "#134E4A",
      accent: "#38BDF8",
      accentLight: "#082F49",
    },
  },
  {
    id: "indigo",
    label: "Indigo",
    description: "Refined purple-blue with bright contrast",
    light: {
      primary: "#4F46E5",
      primaryDark: "#4338CA",
      primaryLight: "#E0E7FF",
      accent: "#0891B2",
      accentLight: "#CFFAFE",
    },
    dark: {
      primary: "#818CF8",
      primaryDark: "#6366F1",
      primaryLight: "#312E81",
      accent: "#22D3EE",
      accentLight: "#164E63",
    },
  },
  {
    id: "rose",
    label: "Rose",
    description: "Warm rose with plum undertones",
    light: {
      primary: "#E11D48",
      primaryDark: "#BE123C",
      primaryLight: "#FFE4E6",
      accent: "#7C3AED",
      accentLight: "#EDE9FE",
    },
    dark: {
      primary: "#FB7185",
      primaryDark: "#F43F5E",
      primaryLight: "#4C0519",
      accent: "#A78BFA",
      accentLight: "#312E81",
    },
  },
  {
    id: "amber",
    label: "Amber",
    description: "Soft gold with grounded orange warmth",
    light: {
      primary: "#D97706",
      primaryDark: "#B45309",
      primaryLight: "#FEF3C7",
      accent: "#EA580C",
      accentLight: "#FFEDD5",
    },
    dark: {
      primary: "#F59E0B",
      primaryDark: "#D97706",
      primaryLight: "#78350F",
      accent: "#FB923C",
      accentLight: "#7C2D12",
    },
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Subtle slate with crisp neutral contrast",
    light: {
      primary: "#475569",
      primaryDark: "#334155",
      primaryLight: "#E2E8F0",
      accent: "#0F172A",
      accentLight: "#E2E8F0",
    },
    dark: {
      primary: "#94A3B8",
      primaryDark: "#CBD5E1",
      primaryLight: "#1E293B",
      accent: "#E2E8F0",
      accentLight: "#334155",
    },
  },
];

export const ACCENT_THEME_MAP = Object.fromEntries(
  ACCENT_THEME_OPTIONS.map((option) => [option.id, option]),
) as Record<AccentThemeId, AccentThemeOption>;
