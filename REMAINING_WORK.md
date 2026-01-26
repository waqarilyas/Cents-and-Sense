# 🔧 Remaining Implementation Steps

## ✅ COMPLETED SO FAR (7/14 tasks):
1. Database schema with user_profile table
2. UserContext for profile management
3. Currency helper utilities
4. Onboarding screen (4-step flow)
5. App routing with onboarding check
6. TransactionContext - accountId required, currency from account
7. BudgetContext - currency-aware tracking
8. Accounts screen - currency selector added (PARTIAL - needs openEditModal fix)

## 🚧 IN PROGRESS - QUICK FIXES NEEDED:

### **Fix accounts.tsx openEditModal:**
The function exists around line 156. Need to find exact match and add:
```typescript
setAccountCurrency(account.currency);
```

### **Add to budgets.tsx:**
1. Import: `import { useUser } from "../../lib/contexts/UserContext";`
2. Import: `import { CurrencySelector } from "../../lib/components/CurrencyPicker";`
3. Add state: `const { defaultCurrency } = useUser();`
4. Add state: `const [budgetCurrency, setBudgetCurrency] = useState(defaultCurrency);`
5. Reset in resetForm: `setBudgetCurrency(defaultCurrency);`
6. In handleAddBudget: Change `defaultCurrency.code` to `budgetCurrency`
7. In modal, add before button:
```tsx
<View style={{ marginTop: spacing.md }}>
  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: spacing.sm }}>
    Currency
  </Text>
  <CurrencySelector
    selectedCode={budgetCurrency}
    onSelect={(code) => setBudgetCurrency(code)}
  />
</View>
```

### **Add to goals.tsx:**
Same pattern as budgets - add CurrencySelector to add/edit modals

### **Add to subscriptions.tsx:**
Same pattern - add Currency Selector to the subscription modal

## 📦 MAJOR UPDATES STILL NEEDED:

### **1. QuickAddModal.tsx** (CRITICAL)
This is the most used component. Changes:
- Import: `import { useUser } from "../contexts/UserContext";`
- Make account selection REQUIRED
- Remove standalone currency picker state
- Show account's currency (read-only) after account selected
- Update flow order: Amount → **Account (Required)** → Category → Description

Current signature:
```typescript
await addTransaction(
  categoryId,
  amount,
  description,
  date,
  transactionType,
  selectedAccountId,
  selectedCurrency
);
```

NEW signature (MUST CHANGE ALL CALLS):
```typescript
await addTransaction(
  selectedAccountId!,  // REQUIRED, moved to first
  categoryId,
  amount,
  description,
  date,
  transactionType
  // currency removed
);
```

### **2. Card Components**
Need to add currency badges to:

**AccountCard.tsx:**
```tsx
<View style={styles.currencyBadge}>
  <Text style={styles.currencyText}>{account.currency}</Text>
</View>
```

**BudgetCard.tsx:**
Add currency display showing budget.currency

**GoalCard.tsx:**
Add currency display showing goal.currency

**TransactionCard.tsx:**
Show transaction.currency

### **3. Dashboard (index.tsx)** (HIGH PRIORITY)
Replace:
```typescript
const totalBalance = getTotalBalance();
```

With:
```typescript
import { getTotalBalanceByCurrency, getMonthlyStatsByCurrency } from "../../lib/utils/currencyHelpers";

const { accounts } = useAccounts();
const { transactions } = useTransactions();
const balancesByCurrency = getTotalBalanceByCurrency(accounts);
const monthlyStatsByCurrency = getMonthlyStatsByCurrency(transactions);
```

Display:
```tsx
<View style={styles.balancesSection}>
  <Text style={styles.sectionTitle}>Your Balances</Text>
  {Object.entries(balancesByCurrency).map(([currency, balance]) => (
    <View key={currency} style={styles.currencyBalance}>
      <Text style={styles.currencyCode}>{currency}</Text>
      <Text style={styles.balance}>{formatCurrencyAmount(balance, currency)}</Text>
    </View>
  ))}
</View>

<View style={styles.statsSection}>
  <Text style={styles.sectionTitle}>This Month</Text>
  {Object.entries(monthlyStatsByCurrency).map(([currency, stats]) => (
    <View key={currency} style={styles.currencyStats}>
      <Text>{currency}</Text>
      <Text>Income: {formatCurrencyAmount(stats.income, currency)}</Text>
      <Text>Expenses: {formatCurrencyAmount(stats.expense, currency)}</Text>
    </View>
  ))}
</View>
```

### **4. Analytics (analysis.tsx)**
Add at top of component:
```typescript
const [selectedCurrency, setSelectedCurrency] = useState<string>("ALL");
const { accounts } = useAccounts();
const uniqueCurrencies = getUniqueCurrenciesFromAccounts(accounts);
```

Add currency filter UI:
```tsx
<View style={styles.currencyFilter}>
  <Select
    value={selectedCurrency}
    options={[
      { label: "All Currencies", value: "ALL" },
      ...uniqueCurrencies.map(c => ({ label: c, value: c }))
    ]}
    onSelect={setSelectedCurrency}
  />
</View>
```

Filter transactions before charts:
```typescript
const filteredTransactions = selectedCurrency === "ALL"
  ? transactions
  : transactions.filter(t => t.currency === selectedCurrency);
```

### **5. Settings (settings.tsx)**
Replace placeholder:
```tsx
{
  icon: "cash-outline",
  label: "Currency",
  subtitle: `${defaultCurrency} - Click to change`,
  onPress: () => {
    // Show currency picker
    setShowCurrencyPicker(true);
  },
  showArrow: true,
},
```

Add state and modal:
```tsx
const { userName, defaultCurrency, updateDefaultCurrency } = useUser();
const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

// Show user name
subtitle: `Hello, ${userName || "User"}!`

// Add CurrencyPicker modal
<CurrencyPicker
  visible={showCurrencyPicker}
  selectedCode={defaultCurrency}
  onSelect={async (currency) => {
    await updateDefaultCurrency(currency.code);
    setShowCurrencyPicker(false);
  }}
  onClose={() => setShowCurrencyPicker(false)}
/>
```

## 📝 QUICK REFERENCE - ALL FILES TO UPDATE:

### DONE:
- ✅ lib/database.ts
- ✅ lib/contexts/UserContext.tsx
- ✅ lib/contexts/TransactionContext.tsx
- ✅ lib/contexts/BudgetContext.tsx
- ✅ lib/utils/currencyHelpers.ts
- ✅ app/onboarding.tsx
- ✅ app/_layout.tsx
- ✅ app/(stack)/accounts.tsx (95% done, needs openEditModal fix)

### TODO:
- ⏳ app/(stack)/budgets.tsx - Add CurrencySelector
- ⏳ app/(stack)/goals.tsx - Add CurrencySelector
- ⏳ app/(stack)/subscriptions.tsx - Add CurrencySelector
- ⏳ lib/components/QuickAddModal.tsx - Make account required, remove currency picker
- ⏳ components/AccountCard.tsx - Add currency badge
- ⏳ components/BudgetCard.tsx - Add currency badge
- ⏳ components/GoalCard.tsx - Add currency badge
- ⏳ components/TransactionCard.tsx - Add currency badge
- ⏳ app/(tabs)/index.tsx - Currency-grouped totals
- ⏳ app/(stack)/analysis.tsx - Currency filtering
- ⏳ app/(tabs)/history.tsx - Currency display
- ⏳ app/(stack)/settings.tsx - Functional currency picker, show user name
- ⏳ app/(stack)/transactions.tsx - Update addTransaction calls

## 🎯 PRIORITY ORDER FOR COMPLETION:

1. **Fix accounts.tsx openEditModal** (1 line)
2. **Update QuickAddModal.tsx** (CRITICAL - most used)
3. **Update budgets.tsx, goals.tsx, subscriptions.tsx** (add currency selectors)
4. **Update Dashboard (index.tsx)** (show currency groups)
5. **Update card components** (show currency badges)
6. **Update Analytics** (currency filtering)
7. **Update Settings** (functional currency picker)
8. **Test end-to-end**

## ⚡ ESTIMATED TIME REMAINING: 2-3 hours

The foundation is solid. Most remaining work is repetitive patterns:
- Add CurrencySelector to forms (same pattern 3x)
- Add currency display to cards (same pattern 4x)
- Update Dashboard/Analytics to use currency helpers
- Update all addTransaction calls to new signature

## 🔍 TESTING CHECKLIST:

After completion, test:
- [ ] Onboarding creates account with correct currency
- [ ] Can add account with any currency
- [ ] Transaction requires account selection
- [ ] Transaction gets currency from account
- [ ] Budget only tracks same-currency transactions
- [ ] Dashboard shows per-currency totals
- [ ] Analytics filters by currency
- [ ] Settings allows currency change
- [ ] All forms show currency selectors
- [ ] All cards show currency badges

