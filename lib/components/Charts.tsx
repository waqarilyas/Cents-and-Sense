import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { spacing, formatCurrency, useThemeColors, ThemeColors } from "../theme";

const useChartStyles = () => {
  const { colors } = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return { colors, styles };
};

// ============================================
// WEEKLY TREND CHART
// ============================================

interface WeeklyTrendData {
  label: string;
  income: number;
  expense: number;
}

interface WeeklyTrendChartProps {
  data: WeeklyTrendData[];
  height?: number;
}

export const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({
  data,
  height = 140,
}) => {
  const { colors, styles } = useChartStyles();
  
  if (data.length === 0) {
    return (
      <View style={[styles.weeklyTrendContainer, { height }]}>
        <Text style={styles.emptyChartText}>No data</Text>
      </View>
    );
  }

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    1,
  );
  const chartHeight = height - 32;

  return (
    <View style={[styles.weeklyTrendContainer, { height }]}>
      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.income }]}
          />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.expense }]}
          />
          <Text style={styles.legendText}>Expense</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.trendBarsContainer}>
        {data.map((item, index) => {
          const incomeHeight = (item.income / maxValue) * chartHeight;
          const expenseHeight = (item.expense / maxValue) * chartHeight;
          return (
            <View
              key={index}
              style={styles.trendBarWrapper}
            >
              <View
                style={[styles.trendBarBackground, { height: chartHeight }]}
              >
                <View style={styles.trendBarGroup}>
                  <View
                    style={[
                      styles.trendBar,
                      {
                        height: incomeHeight || 2,
                        backgroundColor: colors.income,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.trendBar,
                      {
                        height: expenseHeight || 2,
                        backgroundColor: colors.expense,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.trendBarLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Weekly Trend
    weeklyTrendContainer: {
      width: "100%",
    },
    legendContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.lg,
      marginBottom: spacing.sm,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    trendBarsContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    trendBarWrapper: {
      alignItems: "center",
      flex: 1,
    },
    trendBarBackground: {
      justifyContent: "flex-end",
      alignItems: "center",
    },
    trendBarGroup: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 2,
    },
    trendBar: {
      width: 10,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
      minHeight: 2,
    },
    trendBarLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4,
    },
    emptyChartText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 20,
    },
  });
