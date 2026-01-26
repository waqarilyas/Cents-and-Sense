import { useCallback, useMemo, useState } from "react";
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
import { useAccounts } from "../../lib/contexts/AccountContext";
import { useUser } from "../../lib/contexts/UserContext";
import { getCurrency } from "../../lib/currencies";
import {
  spacing,
  borderRadius,
  formatCurrency,
  useThemeColors,
  ThemeColors,
} from "../../lib/theme";
import {
  Card,
  LoadingState,
  Button,
  Input,
  Select,
  BottomSheet,
  ProgressBar,
} from "../../lib/components";
import { Account } from "../../lib/database";

type AccountType = Account["type"];

const ACCOUNT_ICONS: Record<AccountType, keyof typeof Ionicons.glyphMap> = {
  checking: "business-outline",
  savings: "wallet-outline",
  credit_card: "card-outline",
};

const ACCOUNT_LABELS: Record<AccountType, string> = {
  checking: "Checking Account",
  savings: "Savings Account",
  credit_card: "Credit Card",
};

export default function AccountsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { defaultCurrency } = useUser();
  const {
    accounts,
    loading,
    getTotalBalance,
    addAccount,
    updateAccount,
    deleteAccount,
    refreshAccounts,
  } = useAccounts();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCurrencyList, setShowCurrencyList] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [accountBalance, setAccountBalance] = useState("");
  const [accountCurrency, setAccountCurrency] = useState(defaultCurrency);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAccounts();
    setRefreshing(false);
  }, [refreshAccounts]);

  const resetForm = () => {
    setAccountName("");
    setAccountType("checking");
    setAccountBalance("");
    setAccountCurrency(defaultCurrency);
    setEditingAccount(null);
    setShowCurrencyList(false);
    setCurrencySearch("");
  };

  // Filter currencies based on search
  const filteredCurrencies = useMemo(() => {
    const allCurrencies = require("../../lib/currencies").CURRENCIES;
    if (!currencySearch.trim()) {
      return require("../../lib/currencies").getPopularCurrencies();
    }
    return require("../../lib/currencies").searchCurrencies(currencySearch);
  }, [currencySearch]);

  const handleAddAccount = async () => {
    if (!accountName.trim()) {
      Alert.alert("Error", "Please enter an account name");
      return;
    }

    setIsSubmitting(true);
    try {
      await addAccount(accountName.trim(), accountType, accountCurrency);
      setShowAddModal(false);
      resetForm();
      Alert.alert("Success", "Account added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAccount = async () => {
    if (!editingAccount || !accountName.trim()) {
      Alert.alert("Error", "Please enter an account name");
      return;
    }

    const balance = parseFloat(accountBalance) || 0;

    setIsSubmitting(true);
    try {
      await updateAccount(
        editingAccount.id,
        accountName.trim(),
        balance,
        accountCurrency,
      );
      setShowEditModal(false);
      resetForm();
      Alert.alert("Success", "Account updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = (account: Account) => {
    // Prevent deleting the last account
    if (accounts.length <= 1) {
      Alert.alert(
        "Cannot Delete",
        "You must have at least one account. This is your last account and cannot be deleted.",
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete "${account.name}"? This will also delete all associated transactions.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount(account.id);
              Alert.alert("Success", "Account deleted successfully");
            } catch (error) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : "Failed to delete account";
              Alert.alert("Error", errorMessage);
            }
          },
        },
      ],
    );
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setAccountName(account.name);
    setAccountBalance(account.balance.toString());
    setAccountCurrency(account.currency);
    setShowEditModal(true);
  };

  if (loading) {
    return <LoadingState />;
  }

  const totalBalance = getTotalBalance();
  const maxBalance = Math.max(...accounts.map((a) => Math.abs(a.balance)), 1);

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.headerTitle}>Accounts</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "About Accounts",
                "Manage your bank accounts and cards.\\n\\n" +
                "\u2022 Track multiple accounts separately\n" +
                "\u2022 Each account can have its own currency\n" +
                "\u2022 View balances across all accounts\n" +
                "\u2022 Cannot delete your last account\n\n" +
                "Tap an account to edit, long-press to delete.",
                [{ text: "Got it!" }]
              )
            }
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Total Balance Card */}
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text
          style={[
            styles.balanceAmount,
            { color: totalBalance >= 0 ? colors.income : colors.expense },
          ]}
        >
          {formatCurrency(totalBalance)}
        </Text>
        <View style={styles.balanceStats}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Accounts</Text>
            <Text style={styles.balanceStatValue}>{accounts.length}</Text>
          </View>
          <View style={styles.balanceStatDivider} />
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Active</Text>
            <Text style={[styles.balanceStatValue, { color: colors.income }]}>
              {accounts.filter((a) => a.balance > 0).length}
            </Text>
          </View>
        </View>
      </Card>

      {/* Accounts List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {accounts.length > 0 ? (
          accounts.map((account) => {
            const percentage = (Math.abs(account.balance) / maxBalance) * 100;
            return (
              <TouchableOpacity
                key={account.id}
                onPress={() => openEditModal(account)}
                onLongPress={() => handleDeleteAccount(account)}
                delayLongPress={500}
              >
                <Card style={styles.accountCard}>
                  <View style={styles.accountHeader}>
                    <View
                      style={[
                        styles.accountIcon,
                        { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name={ACCOUNT_ICONS[account.type]}
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountType}>
                        {ACCOUNT_LABELS[account.type]}
                      </Text>
                    </View>
                    <View style={styles.accountBalanceContainer}>
                      <Text
                        style={[
                          styles.accountBalance,
                          {
                            color:
                              account.balance >= 0
                                ? colors.income
                                : colors.expense,
                          },
                        ]}
                      >
                        {formatCurrency(account.balance)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.accountProgress}>
                    <ProgressBar
                      progress={percentage}
                      color={
                        account.balance >= 0 ? colors.primary : colors.expense
                      }
                      height={4}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="business-outline"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>No accounts yet</Text>
            <Text style={styles.emptyDescription}>
              Add accounts to start tracking.
            </Text>
            <Button
              title="Add Account"
              onPress={() => setShowAddModal(true)}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        )}

        <View style={styles.hintContainer}>
          <Ionicons name="bulb-outline" size={16} color={colors.textMuted} />
          <Text style={styles.hint}>Tap to edit, long press to delete.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Account Modal */}
      <BottomSheet
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add Account"
      >
        <Input
          label="Account Name"
          value={accountName}
          onChangeText={setAccountName}
          placeholder="e.g., Main Checking"
        />

        <Select
          label="Account Type"
          value={accountType}
          options={[
            { label: "Checking Account", value: "checking" },
            { label: "Savings Account", value: "savings" },
            { label: "Credit Card", value: "credit_card" },
          ]}
          onSelect={(v) => setAccountType(v as AccountType)}
          placeholder="Select account type"
        />

        <View style={{ marginTop: spacing.md }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.textPrimary,
              marginBottom: spacing.sm,
            }}
          >
            Currency
          </Text>
          <TouchableOpacity
            style={[
              styles.currencyButton,
              showCurrencyList && styles.currencyButtonActive,
            ]}
            onPress={() => setShowCurrencyList(!showCurrencyList)}
          >
            <Text style={styles.currencyButtonText}>
              {getCurrency(accountCurrency)?.flag} {accountCurrency} -{" "}
              {getCurrency(accountCurrency)?.name}
            </Text>
            <Ionicons
              name={showCurrencyList ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {showCurrencyList && (
            <View style={styles.currencyListContainer}>
              <Input
                value={currencySearch}
                onChangeText={setCurrencySearch}
                placeholder="Search currencies..."
                style={{ marginBottom: spacing.sm }}
              />
              <ScrollView style={styles.currencyScrollView} nestedScrollEnabled>
                {filteredCurrencies.map((currency: any) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyOption,
                      currency.code === accountCurrency &&
                        styles.currencyOptionSelected,
                    ]}
                    onPress={() => {
                      setAccountCurrency(currency.code);
                      setShowCurrencyList(false);
                      setCurrencySearch("");
                    }}
                  >
                    <Text style={styles.currencyFlag}>{currency.flag}</Text>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencyCode}>{currency.code}</Text>
                      <Text style={styles.currencyName}>{currency.name}</Text>
                    </View>
                    {currency.code === accountCurrency && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <Button
          title={isSubmitting ? "Adding..." : "Add Account"}
          onPress={handleAddAccount}
          disabled={isSubmitting}
          loading={isSubmitting}
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </BottomSheet>

      {/* Edit Account Modal */}
      <BottomSheet
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        title="Edit Account"
      >
        <Input
          label="Account Name"
          value={accountName}
          onChangeText={setAccountName}
          placeholder="e.g., Main Checking"
        />

        <Input
          label="Current Balance"
          value={accountBalance}
          onChangeText={setAccountBalance}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <View style={{ marginTop: spacing.md }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.textPrimary,
              marginBottom: spacing.sm,
            }}
          >
            Currency
          </Text>
          <TouchableOpacity
            style={[
              styles.currencyButton,
              showCurrencyList && styles.currencyButtonActive,
            ]}
            onPress={() => setShowCurrencyList(!showCurrencyList)}
          >
            <Text style={styles.currencyButtonText}>
              {getCurrency(accountCurrency)?.flag} {accountCurrency} -{" "}
              {getCurrency(accountCurrency)?.name}
            </Text>
            <Ionicons
              name={showCurrencyList ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {showCurrencyList && (
            <View style={styles.currencyListContainer}>
              <Input
                value={currencySearch}
                onChangeText={setCurrencySearch}
                placeholder="Search currencies..."
                style={{ marginBottom: spacing.sm }}
              />
              <ScrollView style={styles.currencyScrollView} nestedScrollEnabled>
                {filteredCurrencies.map((currency: any) => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyOption,
                      currency.code === accountCurrency &&
                        styles.currencyOptionSelected,
                    ]}
                    onPress={() => {
                      setAccountCurrency(currency.code);
                      setShowCurrencyList(false);
                      setCurrencySearch("");
                    }}
                  >
                    <Text style={styles.currencyFlag}>{currency.flag}</Text>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencyCode}>{currency.code}</Text>
                      <Text style={styles.currencyName}>{currency.name}</Text>
                    </View>
                    {currency.code === accountCurrency && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.editActions}>
          <Button
            title="Delete"
            onPress={() => {
              if (editingAccount) {
                setShowEditModal(false);
                handleDeleteAccount(editingAccount);
              }
            }}
            variant="danger"
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            title={isSubmitting ? "Saving..." : "Save Changes"}
            onPress={handleEditAccount}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={{ flex: 2 }}
          />
        </View>
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
    balanceCard: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      backgroundColor: colors.primary,
      alignItems: "center",
      paddingVertical: spacing.xl,
    },
    balanceLabel: {
      fontSize: 14,
      color: colors.textInverse + "CC",
      marginBottom: spacing.xs,
    },
    balanceAmount: {
      fontSize: 36,
      fontWeight: "700",
      color: colors.textInverse,
      marginBottom: spacing.lg,
    },
    balanceStats: {
      flexDirection: "row",
      alignItems: "center",
    },
    balanceStat: {
      alignItems: "center",
      paddingHorizontal: spacing.xl,
    },
    balanceStatLabel: {
      fontSize: 12,
      color: colors.textInverse + "B3",
      marginBottom: 4,
    },
    balanceStatValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textInverse,
    },
    balanceStatDivider: {
      width: 1,
      height: 30,
      backgroundColor: colors.textInverse + "33",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
    },
    accountCard: {
      marginBottom: spacing.md,
    },
    accountHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    accountIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    accountInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    accountName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    accountType: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    accountBalanceContainer: {
      alignItems: "flex-end",
    },
    accountBalance: {
      fontSize: 18,
      fontWeight: "700",
    },
    accountProgress: {
      marginTop: spacing.sm,
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
    editActions: {
      flexDirection: "row",
      marginTop: spacing.lg,
    },
    currencyButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
    },
    currencyButtonActive: {
      borderColor: colors.primary,
    },
    currencyButtonText: {
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
    },
    currencyListContainer: {
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      padding: spacing.sm,
    },
    currencyScrollView: {
      maxHeight: 250,
    },
    currencyOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.xs,
    },
    currencyOptionSelected: {
      backgroundColor: colors.primary + "15",
    },
    currencyFlag: {
      fontSize: 24,
      marginRight: spacing.sm,
    },
    currencyInfo: {
      flex: 1,
    },
    currencyCode: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    currencyName: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
