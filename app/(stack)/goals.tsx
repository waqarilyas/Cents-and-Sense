import { useMemo, useState } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGoals } from "../../lib/contexts/GoalContext";
import {
  spacing,
  borderRadius,
  formatCurrency,
  formatDate,
  useThemeColors,
  ThemeColors,
} from "../../lib/theme";
import {
  Card,
  LoadingState,
  Button,
  Input,
  BottomSheet,
  ProgressBar,
} from "../../lib/components";
import { Goal } from "../../lib/database";

export default function GoalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    goals,
    loading,
    addGoal,
    updateGoal,
    updateGoalProgress,
    deleteGoal,
  } = useGoals();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contribution, setContribution] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getGoalProgress = (goal: Goal) => {
    const progress = Math.min(
      (goal.currentAmount / goal.targetAmount) * 100,
      100,
    );
    const daysLeft = Math.ceil(
      (goal.deadline - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const isCompleted = goal.currentAmount >= goal.targetAmount;
    const isOverdue = daysLeft < 0 && !isCompleted;
    const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

    return { progress, daysLeft, isCompleted, isOverdue, remaining };
  };

  const resetForm = () => {
    setGoalName("");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("");
    setContribution("");
    setEditingGoal(null);
  };

  const getDefaultDeadline = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 6); // 6 months from now
    return date.getTime();
  };

  const handleAddGoal = async () => {
    if (!goalName.trim()) {
      Alert.alert("Error", "Please enter a goal name");
      return;
    }
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid target amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await addGoal(
        goalName.trim(),
        parseFloat(targetAmount),
        getDefaultDeadline(),
      );
      setShowAddModal(false);
      resetForm();
      Alert.alert("Success", "Goal created successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to create goal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGoal = async () => {
    if (!editingGoal) return;
    if (!goalName.trim()) {
      Alert.alert("Error", "Please enter a goal name");
      return;
    }
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid target amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateGoal(
        editingGoal.id,
        goalName.trim(),
        parseFloat(targetAmount),
        parseFloat(currentAmount) || 0,
        editingGoal.deadline,
      );
      setShowEditModal(false);
      resetForm();
      Alert.alert("Success", "Goal updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update goal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContribute = async () => {
    if (!editingGoal) return;
    if (!contribution || parseFloat(contribution) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const newAmount = editingGoal.currentAmount + parseFloat(contribution);
      await updateGoalProgress(editingGoal.id, newAmount);
      setShowContributeModal(false);
      resetForm();

      const { isCompleted } = getGoalProgress({
        ...editingGoal,
        currentAmount: newAmount,
      });
      if (isCompleted) {
        Alert.alert("Goal reached", "You've reached your goal.");
      } else {
        Alert.alert(
          "Success",
          `${formatCurrency(parseFloat(contribution))} added to your goal!`,
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add contribution. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      "Delete Goal",
      `Are you sure you want to delete "${goal.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGoal(goal.id);
            } catch (error) {
              Alert.alert("Error", "Failed to delete goal");
            }
          },
        },
      ],
    );
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setShowEditModal(true);
  };

  const openContributeModal = (goal: Goal) => {
    setEditingGoal(goal);
    setContribution("");
    setShowContributeModal(true);
  };

  if (loading) {
    return <LoadingState />;
  }

  const goalsWithProgress = goals.map((goal) => ({
    ...goal,
    ...getGoalProgress(goal),
  }));

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const completedGoals = goalsWithProgress.filter((g) => g.isCompleted).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goals</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="flag" size={20} color={colors.primary} />
            </View>
            <Text style={styles.summaryValue}>{goals.length}</Text>
            <Text style={styles.summaryLabel}>Total Goals</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View
              style={[
                styles.summaryIconContainer,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.success}
              />
            </View>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {completedGoals}
            </Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View
              style={[
                styles.summaryIconContainer,
                { backgroundColor: colors.incomeLight },
              ]}
            >
              <Ionicons name="wallet" size={20} color={colors.income} />
            </View>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              {totalTarget > 0
                ? ((totalSaved / totalTarget) * 100).toFixed(0)
                : 0}
              %
            </Text>
            <Text style={styles.summaryLabel}>Progress</Text>
          </View>
        </View>
        <View style={styles.summaryAmount}>
          <Text style={styles.summaryAmountLabel}>Total Saved</Text>
          <Text style={styles.summaryAmountValue}>
            {formatCurrency(totalSaved)}
          </Text>
          <Text style={styles.summaryAmountTarget}>
            of {formatCurrency(totalTarget)} target
          </Text>
        </View>
      </Card>

      {/* Goals List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(false)}
            colors={[colors.primary]}
          />
        }
      >
        {goalsWithProgress.length > 0 ? (
          goalsWithProgress.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              onPress={() => openContributeModal(goal)}
              onLongPress={() => openEditModal(goal)}
              delayLongPress={500}
            >
              <Card
                style={[
                  styles.goalCard,
                  goal.isCompleted && styles.goalCardCompleted,
                  goal.isOverdue && styles.goalCardOverdue,
                ]}
              >
                <View style={styles.goalHeader}>
                  <View
                    style={[
                      styles.goalIcon,
                      {
                        backgroundColor: goal.isCompleted
                          ? colors.success + "20"
                          : colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={goal.isCompleted ? "checkmark-circle" : "flag"}
                      size={24}
                      color={goal.isCompleted ? colors.success : colors.primary}
                    />
                  </View>
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text
                      style={[
                        styles.goalDeadline,
                        {
                          color: goal.isOverdue
                            ? colors.error
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {goal.isCompleted
                        ? "Goal reached!"
                        : goal.isOverdue
                          ? "Overdue!"
                          : `${goal.daysLeft} days left`}
                    </Text>
                  </View>
                  {!goal.isCompleted && (
                    <TouchableOpacity
                      style={styles.contributeButton}
                      onPress={() => openContributeModal(goal)}
                    >
                      <Text style={styles.contributeButtonText}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.goalAmounts}>
                  <Text style={styles.goalSaved}>
                    {formatCurrency(goal.currentAmount)}
                  </Text>
                  <Text style={styles.goalTarget}>
                    of {formatCurrency(goal.targetAmount)}
                  </Text>
                </View>

                <ProgressBar
                  progress={goal.progress}
                  color={
                    goal.isCompleted
                      ? colors.success
                      : goal.isOverdue
                        ? colors.warning
                        : colors.primary
                  }
                  height={8}
                />

                <View style={styles.goalFooter}>
                  <Text style={styles.goalRemaining}>
                    {goal.isCompleted
                      ? "Complete"
                      : `${formatCurrency(goal.remaining)} to go`}
                  </Text>
                  <Text style={styles.goalPercentage}>
                    {goal.progress.toFixed(0)}%
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="flag-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptyDescription}>
              Create goals to track progress.
            </Text>
            <Button
              title="Create Goal"
              onPress={() => setShowAddModal(true)}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        )}

        {goalsWithProgress.length > 0 && (
          <View style={styles.hintContainer}>
            <Ionicons name="bulb-outline" size={16} color={colors.textMuted} />
            <Text style={styles.hint}>
              Tap to contribute, long press to edit.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <BottomSheet
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Create Goal"
      >
        <Input
          label="Goal Name"
          value={goalName}
          onChangeText={setGoalName}
          placeholder="e.g., Emergency Fund"
        />

        <Input
          label="Target Amount"
          value={targetAmount}
          onChangeText={setTargetAmount}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <Text style={styles.deadlineNote}>
          Deadline is set to 6 months from today. You can change it later.
        </Text>

        <Button
          title={isSubmitting ? "Creating..." : "Create Goal"}
          onPress={handleAddGoal}
          disabled={isSubmitting}
          loading={isSubmitting}
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </BottomSheet>

      {/* Edit Goal Modal */}
      <BottomSheet
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        title="Edit Goal"
      >
        <Input
          label="Goal Name"
          value={goalName}
          onChangeText={setGoalName}
          placeholder="e.g., Emergency Fund"
        />

        <Input
          label="Target Amount"
          value={targetAmount}
          onChangeText={setTargetAmount}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <Input
          label="Current Amount"
          value={currentAmount}
          onChangeText={setCurrentAmount}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <View style={styles.editActions}>
          <Button
            title="Delete"
            onPress={() => {
              if (editingGoal) {
                setShowEditModal(false);
                handleDeleteGoal(editingGoal);
              }
            }}
            variant="danger"
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            title={isSubmitting ? "Saving..." : "Save Changes"}
            onPress={handleEditGoal}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={{ flex: 2 }}
          />
        </View>
      </BottomSheet>

      {/* Contribute Modal */}
      <BottomSheet
        visible={showContributeModal}
        onClose={() => {
          setShowContributeModal(false);
          resetForm();
        }}
        title="Add to Goal"
      >
        {editingGoal && (
          <>
            <View style={styles.contributeInfo}>
              <Text style={styles.contributeGoalName}>{editingGoal.name}</Text>
              <View style={styles.contributeProgress}>
                <Text style={styles.contributeCurrent}>
                  {formatCurrency(editingGoal.currentAmount)}
                </Text>
                <Text style={styles.contributeTarget}>
                  of {formatCurrency(editingGoal.targetAmount)}
                </Text>
              </View>
              <ProgressBar
                progress={
                  (editingGoal.currentAmount / editingGoal.targetAmount) * 100
                }
                color={colors.primary}
                height={6}
              />
            </View>

            <Input
              label="Contribution Amount"
              value={contribution}
              onChangeText={setContribution}
              placeholder="0.00"
              keyboardType="numeric"
            />

            {contribution && parseFloat(contribution) > 0 && (
              <View style={styles.previewContribution}>
                <Text style={styles.previewLabel}>After contribution:</Text>
                <Text style={styles.previewValue}>
                  {formatCurrency(
                    editingGoal.currentAmount + parseFloat(contribution),
                  )}{" "}
                  / {formatCurrency(editingGoal.targetAmount)}
                </Text>
              </View>
            )}

            <Button
              title={isSubmitting ? "Adding..." : "Add Contribution"}
              onPress={handleContribute}
              disabled={isSubmitting}
              loading={isSubmitting}
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </>
        )}
      </BottomSheet>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backButton: {
      paddingVertical: spacing.sm,
    },
    backButtonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: "600",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    addButtonText: {
      color: colors.textInverse,
      fontWeight: "600",
      fontSize: 14,
    },
    summaryCard: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: spacing.lg,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    summaryItem: {
      alignItems: "center",
    },
    summaryIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    summaryLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    summaryDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    summaryAmount: {
      alignItems: "center",
    },
    summaryAmountLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    summaryAmountValue: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.primary,
      marginVertical: 4,
    },
    summaryAmountTarget: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
    },
    goalCard: {
      marginBottom: spacing.md,
    },
    goalCardCompleted: {
      backgroundColor: colors.incomeLight,
      borderWidth: 1,
      borderColor: colors.success,
    },
    goalCardOverdue: {
      borderWidth: 1,
      borderColor: colors.warning,
    },
    goalHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    goalIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    goalInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    goalName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    goalDeadline: {
      fontSize: 13,
      marginTop: 2,
    },
    contributeButton: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    contributeButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
    },
    goalAmounts: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: spacing.sm,
    },
    goalSaved: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    goalTarget: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: spacing.sm,
    },
    goalFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.sm,
    },
    goalRemaining: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    goalPercentage: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.primary,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xxxl,
    },
    emptyIconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primaryLight,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: spacing.xl,
    },
    hintContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: spacing.lg,
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
    },
    deadlineNote: {
      fontSize: 13,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceSecondary,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
    },
    editActions: {
      flexDirection: "row",
      marginTop: spacing.lg,
    },
    contributeInfo: {
      backgroundColor: colors.surfaceSecondary,
      padding: spacing.lg,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
    },
    contributeGoalName: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    contributeProgress: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: spacing.sm,
    },
    contributeCurrent: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.primary,
    },
    contributeTarget: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: spacing.sm,
    },
    previewContribution: {
      backgroundColor: colors.primaryLight,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
      alignItems: "center",
    },
    previewLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    previewValue: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primary,
      marginTop: 4,
    },
  });
