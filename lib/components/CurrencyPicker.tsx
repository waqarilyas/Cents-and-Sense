import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { spacing, borderRadius, useThemeColors, ThemeColors } from "../theme";
import {
  Currency,
  CURRENCIES,
  getPopularCurrencies,
  searchCurrencies,
  getCurrenciesByRegion,
  getAllRegions,
  REGION_NAMES,
  CurrencyRegion,
} from "../currencies";
import * as Haptics from "expo-haptics";

interface CurrencyPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (currency: Currency) => void;
  selectedCode?: string;
  title?: string;
}

type ViewMode = "popular" | "all" | "search";

export const CurrencyPicker: React.FC<CurrencyPickerProps> = ({
  visible,
  onClose,
  onSelect,
  selectedCode,
  title = "Select Currency",
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("popular");
  const [expandedRegion, setExpandedRegion] = useState<CurrencyRegion | null>(
    null,
  );

  const hapticFeedback = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSelect = useCallback(
    (currency: Currency) => {
      hapticFeedback();
      onSelect(currency);
      onClose();
      setSearchQuery("");
      setViewMode("popular");
    },
    [onSelect, onClose],
  );

  const handleClose = useCallback(() => {
    setSearchQuery("");
    setViewMode("popular");
    onClose();
  }, [onClose]);

  // Memoized currency lists
  const popularCurrencies = useMemo(() => getPopularCurrencies(), []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchCurrencies(searchQuery);
  }, [searchQuery]);

  const regions = useMemo(() => getAllRegions(), []);

  const renderCurrencyItem = useCallback(
    ({ item }: { item: Currency }) => {
      const isSelected = item.code === selectedCode;
      return (
        <TouchableOpacity
          style={[
            styles.currencyItem,
            isSelected && styles.currencyItemSelected,
          ]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.currencyFlag}>{item.flag}</Text>
          <View style={styles.currencyInfo}>
            <Text style={styles.currencyCode}>{item.code}</Text>
            <Text style={styles.currencyName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <Text style={styles.currencySymbol}>{item.symbol}</Text>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={colors.primary}
            />
          )}
        </TouchableOpacity>
      );
    },
    [selectedCode, handleSelect],
  );

  const renderRegionSection = useCallback(
    (region: CurrencyRegion) => {
      const currencies = getCurrenciesByRegion(region);
      const isExpanded = expandedRegion === region;

      return (
        <View key={region} style={styles.regionSection}>
          <TouchableOpacity
            style={styles.regionHeader}
            onPress={() => {
              hapticFeedback();
              setExpandedRegion(isExpanded ? null : region);
            }}
          >
            <Text style={styles.regionTitle}>{REGION_NAMES[region]}</Text>
            <View style={styles.regionRight}>
              <Text style={styles.regionCount}>{currencies.length}</Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.regionCurrencies}>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyItem,
                    currency.code === selectedCode &&
                      styles.currencyItemSelected,
                  ]}
                  onPress={() => handleSelect(currency)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.currencyFlag}>{currency.flag}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyCode}>{currency.code}</Text>
                    <Text style={styles.currencyName} numberOfLines={1}>
                      {currency.name}
                    </Text>
                  </View>
                  <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                  {currency.code === selectedCode && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
    },
    [expandedRegion, selectedCode, handleSelect],
  );

  const renderContent = () => {
    // If searching, show search results
    if (searchQuery.trim()) {
      if (searchResults.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No currencies found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={searchResults}
          renderItem={renderCurrencyItem}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    // Popular view
    if (viewMode === "popular") {
      return (
        <FlatList
          data={popularCurrencies}
          renderItem={renderCurrencyItem}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.showAllButton}
              onPress={() => {
                hapticFeedback();
                setViewMode("all");
              }}
            >
              <Text style={styles.showAllText}>Show All Currencies</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          }
        />
      );
    }

    // All currencies by region
    return (
      <FlatList
        data={regions}
        renderItem={({ item }) => renderRegionSection(item)}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.backToPopular}
            onPress={() => {
              hapticFeedback();
              setViewMode("popular");
              setExpandedRegion(null);
            }}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={styles.backToPopularText}>Back to Popular</Text>
          </TouchableOpacity>
        }
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search currency..."
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
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>{renderContent()}</View>
      </View>
    </Modal>
  );
};

// Compact inline currency selector (for forms)
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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currency = CURRENCIES.find((c) => c.code === selectedCode);

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactSelector} onPress={onPress}>
        <Text style={styles.compactSelectorText}>
          {currency?.symbol || selectedCode}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.selector} onPress={onPress}>
      <Text style={styles.selectorFlag}>{currency?.flag}</Text>
      <Text style={styles.selectorCode}>{selectedCode}</Text>
      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      marginHorizontal: spacing.md,
      marginVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxxl,
    },
    currencyItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.xs,
      borderRadius: 12,
      gap: spacing.md,
    },
    currencyItemSelected: {
      backgroundColor: colors.primary + "15",
    },
    currencyFlag: {
      fontSize: 24,
    },
    currencyInfo: {
      flex: 1,
    },
    currencyCode: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    currencyName: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    currencySymbol: {
      fontSize: 18,
      fontWeight: "500",
      color: colors.textSecondary,
      minWidth: 40,
      textAlign: "right",
    },
    showAllButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.lg,
      marginTop: spacing.md,
      gap: spacing.xs,
    },
    showAllText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    backToPopular: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
      gap: spacing.xs,
    },
    backToPopularText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.primary,
    },
    regionSection: {
      marginBottom: spacing.sm,
    },
    regionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 10,
    },
    regionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    regionRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    regionCount: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    regionCurrencies: {
      paddingLeft: spacing.sm,
      paddingTop: spacing.xs,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xxxl,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    // Selector styles
    selector: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 10,
      gap: spacing.sm,
    },
    selectorFlag: {
      fontSize: 18,
    },
    selectorCode: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    compactSelector: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      backgroundColor: colors.surface,
      gap: 2,
    },
    compactSelectorText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
  });

export default CurrencyPicker;
