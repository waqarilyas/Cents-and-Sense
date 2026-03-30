import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { spacing, borderRadius, useThemeColors, ThemeColors } from "../theme";
import {
  Currency,
  CURRENCIES,
  POPULAR_CURRENCY_CODES,
  getPopularCurrencies,
  searchCurrencies,
  getCurrenciesByRegion,
  getAllRegions,
  REGION_NAMES,
} from "../currencies";
import * as Haptics from "expo-haptics";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ─── Inline dropdown (replaces the old full-screen modal) ────────────── */

interface CurrencyDropdownProps {
  selectedCode: string;
  onSelect: (currencyCode: string) => void;
  label?: string;
}

export const CurrencyDropdown: React.FC<CurrencyDropdownProps> = ({
  selectedCode,
  onSelect,
  label,
}) => {
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCurrency = useMemo(
    () => CURRENCIES.find((c) => c.code === selectedCode),
    [selectedCode],
  );

  const popularCurrencies = useMemo(() => getPopularCurrencies(), []);

  // Search results (flat list)
  const searchResults = useMemo(() => {
    if (searchQuery.trim()) {
      return searchCurrencies(searchQuery);
    }
    return null; // null means "show grouped view"
  }, [searchQuery]);

  // All currencies grouped by region (excluding popular, which are shown separately)
  const groupedCurrencies = useMemo(() => {
    const popularSet = new Set(POPULAR_CURRENCY_CODES);
    return getAllRegions()
      .map((region) => ({
        region,
        label: REGION_NAMES[region],
        currencies: getCurrenciesByRegion(region).filter(
          (c) => !popularSet.has(c.code),
        ),
      }))
      .filter((g) => g.currencies.length > 0);
  }, []);

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      if (prev) setSearchQuery("");
      return !prev;
    });
    haptic();
  }, []);

  const handleSelect = useCallback(
    (currency: Currency) => {
      haptic();
      onSelect(currency.code);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(false);
      setSearchQuery("");
    },
    [onSelect],
  );

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.selector, expanded && styles.selectorExpanded]}
        onPress={toggle}
        activeOpacity={0.7}
      >
        {selectedCurrency?.flag ? (
          <Text style={styles.selectorFlag}>{selectedCurrency.flag}</Text>
        ) : (
          <View style={styles.selectorFlagFallback}>
            <Ionicons name="globe-outline" size={16} color={colors.primary} />
          </View>
        )}
        <View style={styles.selectorInfo}>
          <Text style={styles.selectorCode}>{selectedCode}</Text>
          <Text style={styles.selectorName} numberOfLines={1}>
            {selectedCurrency?.name ?? "Unknown"}
          </Text>
        </View>
        <Text style={styles.selectorSymbol}>
          {selectedCurrency?.symbol ?? ""}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.dropdown}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search currencies…"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.list}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {searchResults !== null ? (
              /* ── Search results (flat) ── */
              searchResults.length === 0 ? (
                <Text style={styles.emptyText}>No currencies found</Text>
              ) : (
                searchResults.map((currency) => {
                  const isActive = currency.code === selectedCode;
                  return (
                    <TouchableOpacity
                      key={currency.code}
                      style={[styles.item, isActive && styles.itemActive]}
                      onPress={() => handleSelect(currency)}
                      activeOpacity={0.65}
                    >
                      <Text style={styles.itemFlag}>{currency.flag}</Text>
                      <View style={styles.itemInfo}>
                        <Text
                          style={[
                            styles.itemCode,
                            isActive && { color: colors.primary },
                          ]}
                        >
                          {currency.code}
                        </Text>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {currency.name}
                        </Text>
                      </View>
                      <Text style={styles.itemSymbol}>{currency.symbol}</Text>
                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )
            ) : (
              /* ── Default view: Popular + All by region ── */
              <>
                {/* Popular section */}
                <Text style={styles.sectionHeader}>Popular</Text>
                {popularCurrencies.map((currency) => {
                  const isActive = currency.code === selectedCode;
                  return (
                    <TouchableOpacity
                      key={currency.code}
                      style={[styles.item, isActive && styles.itemActive]}
                      onPress={() => handleSelect(currency)}
                      activeOpacity={0.65}
                    >
                      <Text style={styles.itemFlag}>{currency.flag}</Text>
                      <View style={styles.itemInfo}>
                        <Text
                          style={[
                            styles.itemCode,
                            isActive && { color: colors.primary },
                          ]}
                        >
                          {currency.code}
                        </Text>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {currency.name}
                        </Text>
                      </View>
                      <Text style={styles.itemSymbol}>{currency.symbol}</Text>
                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* All other currencies grouped by region */}
                {groupedCurrencies.map((group) => (
                  <View key={group.region}>
                    <Text style={styles.sectionHeader}>{group.label}</Text>
                    {group.currencies.map((currency) => {
                      const isActive = currency.code === selectedCode;
                      return (
                        <TouchableOpacity
                          key={currency.code}
                          style={[styles.item, isActive && styles.itemActive]}
                          onPress={() => handleSelect(currency)}
                          activeOpacity={0.65}
                        >
                          <Text style={styles.itemFlag}>{currency.flag}</Text>
                          <View style={styles.itemInfo}>
                            <Text
                              style={[
                                styles.itemCode,
                                isActive && { color: colors.primary },
                              ]}
                            >
                              {currency.code}
                            </Text>
                            <Text style={styles.itemName} numberOfLines={1}>
                              {currency.name}
                            </Text>
                          </View>
                          <Text style={styles.itemSymbol}>
                            {currency.symbol}
                          </Text>
                          {isActive && (
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color={colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

/* ─── Legacy CurrencySelector (kept for backward compat) ─────────────── */

interface CurrencySelectorProps {
  selectedCode: string;
  onPress: () => void;
  compact?: boolean;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selectedCode,
  onPress,
  compact = false,
}) => {
  const { colors } = useThemeColors();
  const currency = CURRENCIES.find((c) => c.code === selectedCode);

  if (compact) {
    return (
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 8,
          backgroundColor: colors.surface,
          gap: 2,
        }}
        onPress={onPress}
      >
        <Text
          style={{ fontSize: 16, fontWeight: "600", color: colors.primary }}
        >
          {currency?.symbol || selectedCode}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 18 }}>{currency?.flag}</Text>
      <Text
        style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}
      >
        {selectedCode}
      </Text>
      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

/* ─── No-op CurrencyPicker modal (kept so old imports don't break) ────── */

interface CurrencyPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (currency: Currency) => void;
  selectedCode?: string;
  title?: string;
}

export const CurrencyPicker: React.FC<CurrencyPickerProps> = () => null;

/* ─── Styles ─────────────────────────────────────────────────────────── */

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      marginBottom: spacing.xs,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    selector: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    selectorExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomColor: "transparent",
    },
    selectorFlag: {
      fontSize: 22,
      width: 28,
      textAlign: "center",
    },
    selectorFlagFallback: {
      width: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    selectorInfo: {
      flex: 1,
    },
    selectorCode: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    selectorName: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    selectorSymbol: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    dropdown: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: colors.border,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      overflow: "hidden",
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      paddingVertical: Platform.OS === "ios" ? 8 : 4,
    },
    list: {
      maxHeight: 340,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: 4,
      backgroundColor: colors.background,
    },
    emptyText: {
      textAlign: "center",
      color: colors.textMuted,
      paddingVertical: spacing.lg,
      fontSize: 14,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    itemActive: {
      backgroundColor: colors.primary + "12",
    },
    itemFlag: {
      fontSize: 20,
    },
    itemInfo: {
      flex: 1,
    },
    itemCode: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    itemName: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    itemSymbol: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.textSecondary,
      minWidth: 30,
      textAlign: "right",
    },
  });

export default CurrencyPicker;
