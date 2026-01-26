# 🎯 Production-Level Multi-Currency Architecture Implementation Plan

## **Executive Summary**
Complete overhaul to implement account-centric multi-currency system with mandatory onboarding flow. No currency conversion - each currency operates independently.

---

## **📋 Phase 1: Database & Core Infrastructure**

### **1.1 Database Schema Updates**
- ✅ All tables already have currency fields
- ➕ ADD: `user_profile` table for onboarding data
  - name (TEXT)
  - defaultCurrency (TEXT)
  - onboardingCompleted (INTEGER boolean)
  - createdAt (INTEGER)

### **1.2 New Context: UserContext**
**Purpose:** Manage user profile, name, onboarding status

**API:**
```typescript
interface UserContextType {
  userName: string | null;
  isOnboardingComplete: boolean;
  defaultCurrency: string;
  loading: boolean;
  
  setUserProfile: (name: string, currency: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  getUserProfile: () => Promise<UserProfile | null>;
}
```

---

## **📱 Phase 2: Onboarding Flow**

### **2.1 Onboarding Screen** (`app/onboarding.tsx`)

**Steps:**
1. **Welcome Screen**
   - "Welcome to Budget Tracker"
   - Brief intro to app features

2. **User Info Collection**
   - Name input (required)
   - "What should we call you?"

3. **Currency Selection**
   - Full currency picker
   - "Choose your primary currency"
   - This becomes default for all new items

4. **First Account Setup**
   - Account name (required)
   - Account type (checking/savings/credit_card)
   - Initial balance (optional, default 0)
   - Currency pre-filled from step 3

5. **Completion**
   - "You're all set!"
   - Navigate to main app

**Technical:**
- Store onboarding status in AsyncStorage + database
- Check in _layout.tsx and route accordingly
- Persist user data immediately

### **2.2 Routing Logic** (Update `_layout.tsx`)
```typescript
// Check onboarding status on app load
if (!userContext.isOnboardingComplete) {
  router.replace('/onboarding');
} else {
  // Continue to main app
}
```

---

## **🏗️ Phase 3: Account-Centric Architecture**

### **3.1 Core Rule Changes**

**CRITICAL CHANGES:**

1. **Transactions MUST have accountId**
   - Remove optional accountId
   - Make it required in all contexts
   - Currency derived from account ONLY

2. **Budget Tracking Logic**
   ```typescript
   // Budget only counts transactions where:
   budget.categoryId === transaction.categoryId
   AND
   budget.currency === transaction.currency
   ```

3. **All Totals are Currency-Specific**
   ```typescript
   // OLD (WRONG):
   totalBalance = sum(all accounts)
   
   // NEW (CORRECT):
   balancesByCurrency = {
     USD: sum(accounts where currency = USD),
     PKR: sum(accounts where currency = PKR),
     EUR: sum(accounts where currency = EUR)
   }
   ```

### **3.2 Context Updates**

#### **AccountContext:**
- ✅ Already has currency support
- ✅ No changes needed - keep as is

#### **TransactionContext:**
- ❌ Remove: `currency?: string` parameter
- ✅ Make accountId REQUIRED
- ✅ Get currency from account automatically
- ✅ Update signature:
  ```typescript
  addTransaction(
    accountId: string,  // REQUIRED, not optional
    categoryId: string,
    amount: number,
    description: string,
    date: number,
    type: "income" | "expense"
  )
  ```

- ✅ Update getMonthlyStats:
  ```typescript
  getMonthlyStats(): Record<string, { income: number; expense: number }>;
  // Returns per-currency stats
  ```

- ✅ Add new method:
  ```typescript
  getMonthlyStatsByCurrency(currency: string): { income: number; expense: number };
  ```

#### **BudgetContext:**
- ✅ Update budget tracking to be currency-aware:
  ```typescript
  // When calculating spent amount:
  const spent = transactions
    .filter(t => 
      t.categoryId === budget.categoryId && 
      t.currency === budget.currency && // NEW!
      isInCurrentPeriod(t.date)
    )
    .reduce((sum, t) => sum + t.amount, 0);
  ```

- ✅ Add method:
  ```typescript
  getBudgetsByCurrency(currency: string): Budget[];
  ```

---

## **🎨 Phase 4: UI Updates**

### **4.1 Form Updates - Add Currency Selector**

#### **Accounts Screen** (`app/(stack)/accounts.tsx`)
- ✅ ADD: CurrencySelector to add/edit forms
- ✅ Default to user's defaultCurrency
- Show current currency on account cards

#### **Budgets Screen** (`app/(stack)/budgets.tsx`)
- ✅ ADD: CurrencySelector to add/edit forms
- ✅ Default to user's defaultCurrency
- Show currency badge on budget cards
- Filter transactions by currency when showing spent

#### **Goals Screen** (`app/(stack)/goals.tsx`)
- ✅ ADD: CurrencySelector to add/edit forms
- ✅ Default to user's defaultCurrency
- Show currency on goal cards

#### **Subscriptions Screen** (`app/(stack)/subscriptions.tsx`)
- ✅ ADD: CurrencySelector to add/edit forms
- ✅ Default to user's defaultCurrency
- Show currency on subscription cards
- When creating transaction, use subscription's currency

### **4.2 QuickAddModal** (`lib/components/QuickAddModal.tsx`)

**MAJOR CHANGES:**
1. ❌ Remove standalone currency picker
2. ✅ Make account selection REQUIRED and FIRST
3. ✅ Show account's currency (read-only)
4. ✅ Flow: Amount → **Account** → Category → Description → Submit

**New Flow:**
```
Step 1: Amount
Step 2: SELECT ACCOUNT (required) → shows account currency
Step 3: Category selection
Step 4: Description & details
```

### **4.3 Card Components**

#### **AccountCard** (`components/AccountCard.tsx`)
```tsx
<View style={styles.header}>
  <Text>{account.name}</Text>
  <View style={styles.currencyBadge}>
    <Text>{getCurrency(account.currency).flag}</Text>
    <Text>{account.currency}</Text>
  </View>
</View>
```

#### **BudgetCard** (`components/BudgetCard.tsx`)
```tsx
<View style={styles.header}>
  <Text>{categoryName}</Text>
  <View style={styles.currencyBadge}>
    <Text>{budget.currency}</Text>
  </View>
</View>
```

Similar updates for:
- GoalCard
- TransactionCard (show currency from account)

### **4.4 Settings Screen** (`app/(stack)/settings.tsx`)
- ✅ Replace placeholder currency setting with functional picker
- ✅ Show current default currency
- ✅ Allow changing default (affects new items only)
- ✅ Show user name from onboarding
- ✅ Add "Edit Profile" option

---

## **📊 Phase 5: Analytics & Dashboard Updates**

### **5.1 Dashboard** (`app/(tabs)/index.tsx`)

**Replace single total with currency breakdown:**
```tsx
<View style={styles.balancesSection}>
  <Text style={styles.sectionTitle}>Your Balances</Text>
  {Object.entries(balancesByCurrency).map(([currency, balance]) => (
    <View key={currency} style={styles.currencyBalance}>
      <View style={styles.currencyInfo}>
        <Text style={styles.currencyFlag}>{getCurrency(currency).flag}</Text>
        <Text style={styles.currencyCode}>{currency}</Text>
      </View>
      <Text style={styles.balance}>
        {formatCurrency(balance, currency)}
      </Text>
    </View>
  ))}
</View>

<View style={styles.monthlyStatsSection}>
  <Text style={styles.sectionTitle}>This Month</Text>
  {Object.entries(monthlyStatsByCurrency).map(([currency, stats]) => (
    <View key={currency} style={styles.currencyStats}>
      <Text style={styles.currency}>{currency}</Text>
      <Text style={styles.income}>
        Income: {formatCurrency(stats.income, currency)}
      </Text>
      <Text style={styles.expense}>
        Expenses: {formatCurrency(stats.expense, currency)}
      </Text>
    </View>
  ))}
</View>
```

### **5.2 Analytics Screen** (`app/(stack)/analysis.tsx`)

**Add Currency Filter:**
```tsx
<View style={styles.filters}>
  <CurrencySelector
    selectedCode={selectedCurrency}
    onSelect={(code) => setSelectedCurrency(code)}
  />
  <Button onPress={() => setSelectedCurrency('ALL')}>
    All Currencies
  </Button>
</View>
```

**Update all charts:**
- Filter data by selected currency before rendering
- Show "All Currencies" option (shows each currency separately)
- Update chart titles to include currency
- Pie charts: group by currency, then by category

**Example:**
```typescript
const filteredTransactions = selectedCurrency === 'ALL'
  ? transactions
  : transactions.filter(t => t.currency === selectedCurrency);

// For spending by category chart:
const spendingByCategory = categories.map(cat => ({
  name: cat.name,
  amount: filteredTransactions
    .filter(t => t.categoryId === cat.id && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
}));
```

### **5.3 History/Transactions Screen** (`app/(tabs)/history.tsx`)

**Add Currency Filter:**
- Dropdown to filter by currency
- "All Currencies" option
- Group transactions by currency in list view
- Show currency badge on each transaction

---

## **🧪 Phase 6: Helper Functions & Utilities**

### **6.1 New Utility Functions** (`lib/utils/currencyHelpers.ts`)

```typescript
// Group accounts by currency
export function groupAccountsByCurrency(accounts: Account[]): Record<string, Account[]> {
  return accounts.reduce((acc, account) => {
    if (!acc[account.currency]) {
      acc[account.currency] = [];
    }
    acc[account.currency].push(account);
    return acc;
  }, {} as Record<string, Account[]>);
}

// Calculate total balance per currency
export function getTotalBalanceByCurrency(accounts: Account[]): Record<string, number> {
  return accounts.reduce((acc, account) => {
    acc[account.currency] = (acc[account.currency] || 0) + account.balance;
    return acc;
  }, {} as Record<string, number>);
}

// Get monthly stats per currency
export function getMonthlyStatsByCurrency(
  transactions: Transaction[]
): Record<string, { income: number; expense: number; balance: number }> {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions
    .filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((acc, t) => {
      if (!acc[t.currency]) {
        acc[t.currency] = { income: 0, expense: 0, balance: 0 };
      }
      if (t.type === 'income') {
        acc[t.currency].income += t.amount;
      } else {
        acc[t.currency].expense += t.amount;
      }
      acc[t.currency].balance = acc[t.currency].income - acc[t.currency].expense;
      return acc;
    }, {} as Record<string, { income: number; expense: number; balance: number }>);
}

// Format currency with proper symbol
export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  if (!currency) return `${amount.toFixed(2)}`;
  
  return `${currency.symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits
  })}`;
}
```

### **6.2 Update Theme formatCurrency** (`lib/theme.ts`)
```typescript
export function formatCurrency(amount: number, currencyCode?: string): string {
  if (currencyCode) {
    return formatCurrencyAmount(amount, currencyCode);
  }
  // Fallback to default
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
```

---

## **✅ Phase 7: Testing Checklist**

### **User Journey Testing:**

1. **First Launch → Onboarding**
   - [ ] App detects first launch
   - [ ] Routes to onboarding
   - [ ] Can't skip required fields
   - [ ] Successfully creates user profile
   - [ ] Creates first account with correct currency
   - [ ] Routes to main app after completion

2. **Account Management**
   - [ ] Can create account with any currency
   - [ ] Currency displayed on account card
   - [ ] Multiple accounts with different currencies
   - [ ] Total balance shown per currency

3. **Transaction Flow**
   - [ ] Must select account to add transaction
   - [ ] Currency shows from selected account
   - [ ] Can't manually change currency
   - [ ] Transaction saves with account's currency
   - [ ] Account balance updates correctly

4. **Budget Tracking**
   - [ ] Can create budget in any currency
   - [ ] Budget only tracks transactions in same currency
   - [ ] Spent amount accurate for currency
   - [ ] Progress bar correct

5. **Dashboard**
   - [ ] Shows balances grouped by currency
   - [ ] Monthly stats per currency
   - [ ] No mixing of currencies
   - [ ] All amounts have currency indicators

6. **Analytics**
   - [ ] Can filter by currency
   - [ ] Charts show correct data for selected currency
   - [ ] "All Currencies" mode works
   - [ ] No data mixing between currencies

7. **Settings**
   - [ ] Can change default currency
   - [ ] User name displayed
   - [ ] Can edit profile

---

## **🚀 Implementation Order**

### **Priority 1 (Critical Path):**
1. ✅ Create user_profile table in database
2. ✅ Create UserContext
3. ✅ Build OnboardingScreen
4. ✅ Update _layout.tsx routing
5. ✅ Update TransactionContext (accountId required)
6. ✅ Update QuickAddModal (account required)

### **Priority 2 (Core Features):**
7. ✅ Add currency selectors to all forms
8. ✅ Update BudgetContext (currency-aware)
9. ✅ Update all card components (show currency)
10. ✅ Create currency helper utilities

### **Priority 3 (UI/UX Polish):**
11. ✅ Update Dashboard (currency breakdown)
12. ✅ Update Analytics (currency filter)
13. ✅ Update Settings (functional currency picker)
14. ✅ Update History screen (currency filter)

### **Priority 4 (Final Testing):**
15. ✅ End-to-end testing
16. ✅ Edge case handling
17. ✅ Performance optimization

---

## **📝 Key Decisions & Rationale**

### **Why Account-Centric?**
- ✅ Matches real-world: money exists in accounts
- ✅ Clear currency source of truth
- ✅ Prevents user confusion about currency selection
- ✅ Easier data integrity

### **Why No Conversion?**
- ✅ Avoids exchange rate complexity
- ✅ No API dependencies
- ✅ Clear separation of currencies
- ✅ Users manage their own currency conversions

### **Why Mandatory Onboarding?**
- ✅ Ensures proper setup from start
- ✅ Collects essential user info
- ✅ Creates first account (required for app to work)
- ✅ Sets expectations for account-centric flow

### **Why Currency Isolation?**
- ✅ No mixing different currencies in totals
- ✅ Each currency operates independently
- ✅ Budgets track single currency only
- ✅ Clear, unambiguous reporting

---

## **⚠️ Breaking Changes**

### **API Changes:**
```typescript
// OLD:
addTransaction(categoryId, amount, description, date, type, accountId?, currency?)

// NEW:
addTransaction(accountId, categoryId, amount, description, date, type)
// accountId now required, currency removed (derived from account)
```

### **Data Migration:**
- Existing transactions without accountId will show warning
- Existing data keeps current currency values
- No data loss, just structure changes

---

## **🎯 Success Metrics**

- [ ] 100% of transactions have accountId
- [ ] 100% of entities show currency clearly
- [ ] 0 instances of mixed-currency math
- [ ] Onboarding completion rate 100% (mandatory)
- [ ] All analytics work with currency filter
- [ ] No USD hardcoded defaults remain

---

**TOTAL ESTIMATED IMPLEMENTATION TIME: 4-6 hours**
**FILES TO MODIFY: ~25 files**
**NEW FILES TO CREATE: ~5 files**
