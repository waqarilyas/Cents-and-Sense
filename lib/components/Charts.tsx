import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Text } from "react-native-paper";
import Svg, { G, Path, Circle, Rect, Text as SvgText } from "react-native-svg";
import { colors, spacing, formatCurrency } from "../theme";

const { width } = Dimensions.get("window");

// ============================================
// DONUT CHART COMPONENT
// ============================================

interface DonutChartData {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 180,
  strokeWidth = 24,
  centerLabel = "Total",
  centerValue,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate total for percentage if not provided
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  // Sort data by amount (largest first) for better visual
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  // Generate paths
  let cumulativePercent = 0;
  const paths = sortedData.map((item) => {
    const percent = total > 0 ? (item.amount / total) * 100 : 0;
    const dashLength = (percent / 100) * circumference;
    const dashOffset = circumference - (cumulativePercent / 100) * circumference;
    cumulativePercent += percent;

    return {
      ...item,
      dashLength,
      dashOffset,
      percent,
    };
  });

  if (data.length === 0 || total === 0) {
    return (
      <View style={[styles.donutContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.surfaceSecondary}
            strokeWidth={strokeWidth}
          />
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutCenterValue}>$0</Text>
          <Text style={styles.donutCenterLabel}>No data</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.donutContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.surfaceSecondary}
          strokeWidth={strokeWidth}
        />
        {/* Data segments */}
        <G rotation="-90" origin={`${center}, ${center}`}>
          {paths.map((item, index) => (
            <Circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${item.dashLength} ${circumference}`}
              strokeDashoffset={-item.dashOffset + circumference}
              strokeLinecap="round"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutCenterValue}>
          {centerValue || formatCurrency(total)}
        </Text>
        <Text style={styles.donutCenterLabel}>{centerLabel}</Text>
      </View>
    </View>
  );
};

// ============================================
// BAR CHART COMPONENT
// ============================================

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  barColor?: string;
  showValues?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 120,
  barColor = colors.primary,
  showValues = false,
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = (width - spacing.lg * 2 - spacing.sm * (data.length - 1)) / data.length;
  const chartHeight = height - 24; // Leave space for labels

  return (
    <View style={[styles.barChartContainer, { height }]}>
      <View style={styles.barsContainer}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * chartHeight;
          return (
            <View key={index} style={styles.barWrapper}>
              <View style={[styles.barBackground, { height: chartHeight }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: item.color || barColor,
                      width: Math.min(barWidth - 8, 28),
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
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
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    1
  );
  const chartHeight = height - 32; // Leave space for labels and legend
  const barWidth = (width - spacing.lg * 2 - 16) / data.length;

  return (
    <View style={[styles.weeklyTrendContainer, { height }]}>
      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.trendBarsContainer}>
        {data.map((item, index) => {
          const incomeHeight = (item.income / maxValue) * chartHeight;
          const expenseHeight = (item.expense / maxValue) * chartHeight;
          return (
            <View key={index} style={[styles.trendBarWrapper, { width: barWidth }]}>
              <View style={[styles.trendBarBackground, { height: chartHeight }]}>
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
// SPENDING CATEGORY LIST
// ============================================

interface CategorySpendingProps {
  data: DonutChartData[];
  maxItems?: number;
}

export const CategorySpendingList: React.FC<CategorySpendingProps> = ({
  data,
  maxItems = 5,
}) => {
  const sortedData = [...data].sort((a, b) => b.amount - a.amount).slice(0, maxItems);
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <View style={styles.categoryListContainer}>
      {sortedData.map((item, index) => {
        const percentage = total > 0 ? (item.amount / total) * 100 : 0;
        return (
          <View key={index} style={styles.categoryListItem}>
            <View style={styles.categoryListLeft}>
              <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
              <Text style={styles.categoryName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <View style={styles.categoryListRight}>
              <Text style={styles.categoryAmount}>{formatCurrency(item.amount)}</Text>
              <Text style={styles.categoryPercent}>{percentage.toFixed(0)}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ============================================
// BUDGET PROGRESS ITEM
// ============================================

interface BudgetProgressProps {
  name: string;
  spent: number;
  limit: number;
  color?: string;
}

export const BudgetProgressItem: React.FC<BudgetProgressProps> = ({
  name,
  spent,
  limit,
  color = colors.primary,
}) => {
  const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const isOverBudget = spent > limit;
  const progressColor = isOverBudget ? colors.expense : color;

  return (
    <View style={styles.budgetProgressContainer}>
      <View style={styles.budgetProgressHeader}>
        <Text style={styles.budgetProgressName}>{name}</Text>
        <Text style={[styles.budgetProgressAmount, isOverBudget && { color: colors.expense }]}>
          {formatCurrency(spent)} / {formatCurrency(limit)}
        </Text>
      </View>
      <View style={styles.budgetProgressBarBg}>
        <View
          style={[
            styles.budgetProgressBar,
            {
              width: `${percentage}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Donut Chart
  donutContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenterValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  donutCenterLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Bar Chart
  barChartContainer: {
    width: "100%",
  },
  barsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barWrapper: {
    alignItems: "center",
    flex: 1,
  },
  barBackground: {
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },

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

  // Category List
  categoryListContainer: {
    gap: spacing.sm,
  },
  categoryListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryListLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  categoryListRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  categoryPercent: {
    fontSize: 12,
    color: colors.textMuted,
    width: 36,
    textAlign: "right",
  },

  // Budget Progress
  budgetProgressContainer: {
    marginBottom: spacing.md,
  },
  budgetProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  budgetProgressName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  budgetProgressAmount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  budgetProgressBarBg: {
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    overflow: "hidden",
  },
  budgetProgressBar: {
    height: "100%",
    borderRadius: 4,
  },
});
