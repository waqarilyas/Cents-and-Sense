import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { colors, spacing, borderRadius, typography, shadows } from "./theme";

// ========================================
// CARD COMPONENT
// ========================================
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const cardStyle: StyleProp<ViewStyle> = [styles.card, style];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

// ========================================
// BUTTON COMPONENT
// ========================================
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.buttonFullWidth,
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText_${variant}`],
    styles[`buttonText_${size}`],
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.textInverse : colors.primary}
          size="small"
        />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <View style={styles.buttonIcon}>{icon}</View>}
          <Text style={textStyles}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ========================================
// INPUT COMPONENT
// ========================================
interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  multiline?: boolean;
  error?: string;
  secureTextEntry?: boolean;
  style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  error,
  secureTextEntry,
  style,
}) => {
  return (
    <View style={[styles.inputContainer, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
};

// ========================================
// ICON BADGE COMPONENT
// ========================================
interface IconBadgeProps {
  icon: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  icon,
  color = colors.primary,
  size = "md",
}) => {
  const sizes = {
    sm: { container: 36, icon: 18 },
    md: { container: 44, icon: 22 },
    lg: { container: 56, icon: 28 },
  };

  return (
    <View
      style={[
        styles.iconBadge,
        {
          width: sizes[size].container,
          height: sizes[size].container,
          borderRadius: sizes[size].container / 2,
          backgroundColor: color + "20", // 20% opacity
        },
      ]}
    >
      <Text style={{ fontSize: sizes[size].icon }}>{icon}</Text>
    </View>
  );
};

// ========================================
// STAT CARD COMPONENT
// ========================================
interface StatCardProps {
  label: string;
  value: string;
  icon?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  color = colors.textPrimary,
  style,
}) => {
  return (
    <Card style={[styles.statCard, style as ViewStyle]}>
      <View style={styles.statCardHeader}>
        {icon && <Text style={styles.statCardIcon}>{icon}</Text>}
        <Text style={styles.statCardLabel}>{label}</Text>
      </View>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      {trend && (
        <Text
          style={[
            styles.statCardTrend,
            {
              color:
                trend === "up"
                  ? colors.success
                  : trend === "down"
                    ? colors.error
                    : colors.textSecondary,
            },
          ]}
        >
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} vs last period
        </Text>
      )}
    </Card>
  );
};

// ========================================
// EMPTY STATE COMPONENT
// ========================================
interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>{icon}</Text>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {description && (
        <Text style={styles.emptyStateDescription}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          style={{ marginTop: spacing.lg }}
        />
      )}
    </View>
  );
};

// ========================================
// LOADING STATE COMPONENT
// ========================================
export const LoadingState: React.FC = () => {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

// ========================================
// SECTION HEADER COMPONENT
// ========================================
interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  action,
}) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionHeaderAction}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ========================================
// PROGRESS BAR COMPONENT
// ========================================
interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  backgroundColor?: string;
  height?: number;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = colors.primary,
  backgroundColor = colors.surfaceSecondary,
  height = 8,
  showLabel = false,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <View>
      <View style={[styles.progressBarContainer, { height, backgroundColor }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: color,
              height,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.progressBarLabel}>
          {clampedProgress.toFixed(0)}%
        </Text>
      )}
    </View>
  );
};

// ========================================
// BOTTOM SHEET MODAL COMPONENT
// ========================================
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={styles.bottomSheet}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.bottomSheetHandle} />
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.bottomSheetClose}>
              <Text style={styles.bottomSheetCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bottomSheetContent}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ========================================
// SELECT/PICKER COMPONENT
// ========================================
interface SelectOption {
  label: string;
  value: string;
  icon?: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select...",
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TouchableOpacity
        style={styles.selectTrigger}
        onPress={() => setIsOpen(true)}
      >
        <Text
          style={[
            styles.selectTriggerText,
            !selectedOption && { color: colors.textMuted },
          ]}
        >
          {selectedOption ? (
            <>
              {selectedOption.icon && `${selectedOption.icon} `}
              {selectedOption.label}
            </>
          ) : (
            placeholder
          )}
        </Text>
        <Text style={styles.selectArrow}>▼</Text>
      </TouchableOpacity>

      <BottomSheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title={label || "Select Option"}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.selectOption,
              option.value === value && styles.selectOptionSelected,
            ]}
            onPress={() => {
              onSelect(option.value);
              setIsOpen(false);
            }}
          >
            {option.icon && (
              <Text style={styles.selectOptionIcon}>{option.icon}</Text>
            )}
            <Text
              style={[
                styles.selectOptionText,
                option.value === value && styles.selectOptionTextSelected,
              ]}
            >
              {option.label}
            </Text>
            {option.value === value && (
              <Text style={styles.selectCheckmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </View>
  );
};

// ========================================
// LIST ITEM COMPONENT
// ========================================
interface ListItemProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  left,
  right,
  onPress,
  style,
}) => {
  const content = (
    <View style={[styles.listItem, style]}>
      {left && <View style={styles.listItemLeft}>{left}</View>}
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.listItemSubtitle}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.listItemRight}>{right}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },

  // Button
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
  },
  button_primary: {
    backgroundColor: colors.primary,
  },
  button_secondary: {
    backgroundColor: colors.surfaceSecondary,
  },
  button_outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  button_ghost: {
    backgroundColor: "transparent",
  },
  button_danger: {
    backgroundColor: colors.error,
  },
  button_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  button_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  button_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  buttonFullWidth: {
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  buttonText: {
    fontWeight: "600",
  },
  buttonText_primary: {
    color: colors.textInverse,
  },
  buttonText_secondary: {
    color: colors.textPrimary,
  },
  buttonText_outline: {
    color: colors.primary,
  },
  buttonText_ghost: {
    color: colors.primary,
  },
  buttonText_danger: {
    color: colors.textInverse,
  },
  buttonText_sm: {
    fontSize: 14,
  },
  buttonText_md: {
    fontSize: 16,
  },
  buttonText_lg: {
    fontSize: 18,
  },

  // Input
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.smallSemibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: colors.error,
  },
  inputErrorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // Icon Badge
  iconBadge: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Stat Card
  statCard: {
    flex: 1,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statCardIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  statCardLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statCardValue: {
    ...typography.mediumNumber,
  },
  statCardTrend: {
    ...typography.caption,
    marginTop: spacing.xs,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxxl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptyStateDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },

  // Loading State
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionHeaderTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  sectionHeaderAction: {
    ...typography.smallSemibold,
    color: colors.primary,
  },

  // Progress Bar
  progressBarContainer: {
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  progressBarFill: {
    borderRadius: borderRadius.full,
  },
  progressBarLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "right",
  },

  // Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: "90%",
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: spacing.md,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bottomSheetTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  bottomSheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSheetCloseText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  bottomSheetContent: {
    padding: spacing.lg,
  },

  // Select
  selectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectTriggerText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  selectArrow: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  selectOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  selectOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  selectOptionIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  selectOptionText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  selectOptionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  selectCheckmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "700",
  },

  // List Item
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listItemLeft: {
    marginRight: spacing.md,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  listItemSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listItemRight: {
    marginLeft: spacing.md,
  },
});
