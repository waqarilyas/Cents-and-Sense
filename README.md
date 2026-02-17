# Budget Tracker App

A React Native budget tracking app built with Expo SDK 52, expo-router, and expo-sqlite.

---

## Testing

The project has a comprehensive test suite with **397 tests across 22 suites**, covering unit tests, context tests, and end-to-end integration flows.

### Prerequisites

Make sure dependencies are installed:

```bash
npm install
```

### Running Tests

| Command                  | Description                             |
| ------------------------ | --------------------------------------- |
| `npm test`               | Run all tests                           |
| `npm run test:coverage`  | Run all tests with coverage report      |
| `npx jest --no-coverage` | Run all tests without coverage (faster) |

### Running Specific Tests

```bash
# Run a single test file
npx jest __tests__/e2e/transactions.test.tsx

# Run all E2E tests
npx jest __tests__/e2e/

# Run all unit tests for contexts
npx jest __tests__/contexts/

# Run all utility tests
npx jest __tests__/utils/

# Run tests matching a pattern
npx jest --testPathPattern="budget"
```

### Test Structure

```
__tests__/
├── setup.ts                  # Global test setup & mocks
├── __mocks__/
│   └── react-native.ts       # React Native module mock
├── utils/                    # Unit tests for utility functions
│   ├── currencies.test.ts
│   ├── currencyHelpers.test.ts
│   ├── periodCalculations.test.ts
│   ├── smartCategories.test.ts
│   └── validation.test.ts
├── contexts/                 # Context provider unit tests
│   ├── AccountContext.test.tsx
│   ├── BudgetContext.test.tsx
│   ├── CategoryContext.test.tsx
│   ├── CurrencyContext.test.tsx
│   ├── GoalContext.test.tsx
│   ├── SettingsContext.test.tsx
│   ├── SubscriptionContext.test.tsx
│   ├── TransactionContext.test.tsx
│   └── UserContext.test.tsx
└── e2e/                      # End-to-end integration tests
    ├── helpers.tsx            # InMemoryDB, provider wrapper, test utilities
    ├── onboarding.test.tsx
    ├── transactions.test.tsx
    ├── budgets.test.tsx
    ├── goals.test.tsx
    ├── subscriptions.test.tsx
    ├── multi-currency.test.tsx
    ├── categories-settings.test.tsx
    └── cross-context.test.tsx
```

### Test Categories

#### Unit Tests (`__tests__/utils/`)

Test pure utility functions in isolation — currency formatting, validation rules, budget period calculations, and smart category matching.

#### Context Tests (`__tests__/contexts/`)

Test each React Context provider individually with a mocked SQLite database. Covers CRUD operations, validation, error handling, and state management for all 9 contexts (User, Account, Category, Transaction, Budget, Goal, Subscription, Currency, Settings).

#### E2E Integration Tests (`__tests__/e2e/`)

Simulate real user flows across the full provider stack using an in-memory database. All 9 context providers are nested in the same order as the real app, so cross-context interactions (e.g. adding a transaction updates the account balance) are tested end-to-end.

| Suite                                | What it covers                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| **Onboarding**                       | Profile setup, account auto-creation, data persistence across restarts                 |
| **Transactions**                     | Income/expense with balance updates, delete reverting balance, validation              |
| **Budgets**                          | Per-category budgets, monthly overall budget, carryover toggle                         |
| **Goals**                            | Savings goals, progress tracking, detail updates                                       |
| **Subscriptions**                    | Auto-processing (creates transaction + updates balance), skip pending, toggle active   |
| **Multi-Currency**                   | Accounts/goals/budgets in different currencies, default currency switching             |
| **Categories & Settings & Accounts** | Category CRUD with deletion protection, settings persistence/reset, account management |
| **Cross-Context**                    | Full user journey (onboard → transact → budget → goal), data integrity across contexts |

### Test Configuration

- **Runner:** Jest with ts-jest
- **Environment:** jsdom
- **Config file:** `jest.config.js`
- **Setup file:** `__tests__/setup.ts` (mocks for expo-sqlite, expo-haptics, expo-router, AsyncStorage, and more)
- **Coverage source:** `lib/**/*.{ts,tsx}`
