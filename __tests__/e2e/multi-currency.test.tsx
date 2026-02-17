/**
 * E2E Test: Multi-Currency Flow
 *
 * Tests working with accounts in different currencies:
 * 1. Create accounts in USD and EUR
 * 2. Add transactions in each currency
 * 3. Verify balances are tracked per-currency
 * 4. Switch default currency
 * 5. Goals in different currencies
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { testDB, setupDatabaseMock, resetAsyncStorage, createAppWrapper } from './helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

setupDatabaseMock();

describe('E2E: Multi-Currency Flow', () => {
  let AppWrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(async () => {
    testDB.reset();
    resetAsyncStorage();
    jest.clearAllMocks();

    testDB.insertDirect('user_profile', {
      id: 'user_profile_001', name: 'Alice', defaultCurrency: 'USD',
      onboardingCompleted: 1, createdAt: Date.now(), updatedAt: Date.now(),
    });

    testDB.insertDirect('categories', {
      id: 'cat_salary', name: 'Salary', type: 'income', color: '#4CAF50', createdAt: Date.now(),
    });
    testDB.insertDirect('categories', {
      id: 'cat_food', name: 'Food', type: 'expense', color: '#FF5722', createdAt: Date.now(),
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@budget_app_onboarding_complete') return Promise.resolve('true');
      if (key === '@budget_app_currency') return Promise.resolve('USD');
      return Promise.resolve(null);
    });

    AppWrapper = createAppWrapper();
  });

  it('creates accounts in different currencies', async () => {
    const { useAccounts } = require('../../lib/contexts/AccountContext');

    let accState: any = {};

    function Probe() {
      accState = useAccounts();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(accState.loading).toBe(false);
    });

    await act(async () => {
      await accState.addAccount('US Account', 'checking', 'USD');
    });
    await act(async () => {
      await accState.addAccount('Euro Account', 'savings', 'EUR');
    });

    const accounts = testDB.getTable('accounts');
    expect(accounts.length).toBe(2);

    const usdAcc = accounts.find((a: any) => a.currency === 'USD');
    const eurAcc = accounts.find((a: any) => a.currency === 'EUR');
    expect(usdAcc).toBeTruthy();
    expect(eurAcc).toBeTruthy();
    expect(usdAcc.type).toBe('checking');
    expect(eurAcc.type).toBe('savings');
  });

  it('transactions in different currencies update correct account balances', async () => {
    const { useTransactions } = require('../../lib/contexts/TransactionContext');

    // Pre-seed two accounts
    testDB.insertDirect('accounts', {
      id: 'acc_usd', name: 'US Account', type: 'checking',
      balance: 2000, currency: 'USD', isDefault: 1, createdAt: Date.now(),
    });
    testDB.insertDirect('accounts', {
      id: 'acc_eur', name: 'Euro Account', type: 'savings',
      balance: 1000, currency: 'EUR', isDefault: 0, createdAt: Date.now(),
    });

    let txState: any = {};

    function Probe() {
      txState = useTransactions();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(txState.loading).toBe(false);
    });

    // Income to USD account
    await act(async () => {
      await txState.addTransaction('acc_usd', 'cat_salary', 500, 'US Salary', Date.now(), 'income');
    });

    // Expense from EUR account
    await act(async () => {
      await txState.addTransaction('acc_eur', 'cat_food', 100, 'Paris lunch', Date.now(), 'expense');
    });

    const accounts = testDB.getTable('accounts');
    const usdAcc = accounts.find((a: any) => a.id === 'acc_usd');
    const eurAcc = accounts.find((a: any) => a.id === 'acc_eur');

    expect(usdAcc.balance).toBe(2500); // 2000 + 500
    expect(eurAcc.balance).toBe(900);  // 1000 - 100

    // Verify transactions have correct currencies
    const transactions = testDB.getTable('transactions');
    expect(transactions.find((t: any) => t.currency === 'USD')).toBeTruthy();
    expect(transactions.find((t: any) => t.currency === 'EUR')).toBeTruthy();
  });

  it('switching default currency', async () => {
    const { useCurrency } = require('../../lib/contexts/CurrencyContext');
    const { useUser } = require('../../lib/contexts/UserContext');

    let currencyState: any = {};
    let userState: any = {};

    function Probe() {
      currencyState = useCurrency();
      userState = useUser();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(userState.loading).toBe(false);
    });

    expect(currencyState.defaultCurrencyCode).toBe('USD');

    // Switch to EUR
    await act(async () => {
      await currencyState.setDefaultCurrency('EUR');
    });

    expect(currencyState.defaultCurrencyCode).toBe('EUR');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@budget_app_currency', 'EUR');
  });

  it('goals can be created in different currencies', async () => {
    const { useGoals } = require('../../lib/contexts/GoalContext');

    let goalState: any = {};

    function Probe() {
      goalState = useGoals();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(goalState.loading).toBe(false);
    });

    const deadline = Date.now() + 90 * 86400000;

    await act(async () => {
      await goalState.addGoal('USD Goal', 5000, deadline, 'USD');
    });
    await act(async () => {
      await goalState.addGoal('EUR Goal', 3000, deadline, 'EUR');
    });

    const goals = testDB.getTable('goals');
    expect(goals.length).toBe(2);
    expect(goals.find((g: any) => g.currency === 'USD')).toBeTruthy();
    expect(goals.find((g: any) => g.currency === 'EUR')).toBeTruthy();
  });

  it('budgets in different currencies', async () => {
    const { useBudgets } = require('../../lib/contexts/BudgetContext');

    let budgetState: any = {};

    function Probe() {
      budgetState = useBudgets();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(budgetState.loading).toBe(false);
    });

    await act(async () => {
      await budgetState.addBudget('cat_food', 300, 'monthly', 'USD');
    });

    await act(async () => {
      await budgetState.addBudget('cat_salary', 500, 'monthly', 'EUR');
    });

    const budgets = testDB.getTable('budgets');
    expect(budgets.length).toBe(2);
    expect(budgets.find((b: any) => b.currency === 'USD')).toBeTruthy();
    expect(budgets.find((b: any) => b.currency === 'EUR')).toBeTruthy();
  });

  it('total balance calculation per account', async () => {
    const { useAccounts } = require('../../lib/contexts/AccountContext');

    testDB.insertDirect('accounts', {
      id: 'acc_1', name: 'Checking', type: 'checking',
      balance: 2000, currency: 'USD', isDefault: 1, createdAt: Date.now(),
    });
    testDB.insertDirect('accounts', {
      id: 'acc_2', name: 'Savings', type: 'savings',
      balance: 5000, currency: 'USD', isDefault: 0, createdAt: Date.now(),
    });

    let accState: any = {};

    function Probe() {
      accState = useAccounts();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(accState.loading).toBe(false);
    });

    const totalBalance = accState.getTotalBalance();
    expect(totalBalance).toBe(7000); // 2000 + 5000
  });
});
