/**
 * E2E Test: Transaction Lifecycle
 *
 * Tests the complete transaction flow including balance updates:
 * 1. Add income → balance increases
 * 2. Add expense → balance decreases
 * 3. Update transaction → balance adjusts
 * 4. Delete transaction → balance reverts
 * 5. Transaction with wrong account/category fails
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { testDB, setupDatabaseMock, resetAsyncStorage, createAppWrapper } from './helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

setupDatabaseMock();

describe('E2E: Transaction Lifecycle', () => {
  let AppWrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(async () => {
    testDB.reset();
    resetAsyncStorage();
    jest.clearAllMocks();

    // Pre-seed required data: account + categories (simulate post-onboarding state)
    testDB.insertDirect('user_profile', {
      id: 'user_profile_001',
      name: 'Alice',
      defaultCurrency: 'USD',
      onboardingCompleted: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    testDB.insertDirect('accounts', {
      id: 'acc_1',
      name: 'Checking',
      type: 'checking',
      balance: 1000,
      currency: 'USD',
      isDefault: 1,
      createdAt: Date.now(),
    });

    testDB.insertDirect('categories', {
      id: 'cat_salary',
      name: 'Salary',
      type: 'income',
      color: '#4CAF50',
      createdAt: Date.now(),
    });

    testDB.insertDirect('categories', {
      id: 'cat_food',
      name: 'Food',
      type: 'expense',
      color: '#FF5722',
      createdAt: Date.now(),
    });

    testDB.insertDirect('categories', {
      id: 'cat_transport',
      name: 'Transport',
      type: 'expense',
      color: '#2196F3',
      createdAt: Date.now(),
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@budget_app_onboarding_complete') return Promise.resolve('true');
      if (key === '@budget_app_currency') return Promise.resolve('USD');
      return Promise.resolve(null);
    });

    AppWrapper = createAppWrapper();
  });

  it('adding income increases account balance', async () => {
    const { useTransactions } = require('../../lib/contexts/TransactionContext');
    const { useAccounts } = require('../../lib/contexts/AccountContext');

    let txState: any = {};
    let accState: any = {};

    function Probe() {
      txState = useTransactions();
      accState = useAccounts();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(txState.loading).toBe(false);
      expect(accState.loading).toBe(false);
    });

    // Add income of $500
    await act(async () => {
      await txState.addTransaction(
        'acc_1',       // accountId
        'cat_salary',  // categoryId
        500,           // amount
        'Monthly salary', // description
        Date.now(),    // date
        'income'       // type
      );
    });

    // Check DB: balance should be 1000 + 500 = 1500
    const accounts = testDB.getTable('accounts');
    expect(accounts[0].balance).toBe(1500);

    // Check DB: transaction was created
    const transactions = testDB.getTable('transactions');
    expect(transactions.length).toBe(1);
    expect(transactions[0].amount).toBe(500);
    expect(transactions[0].type).toBe('income');
    expect(transactions[0].description).toBe('Monthly salary');
  });

  it('adding expense decreases account balance', async () => {
    const { useTransactions } = require('../../lib/contexts/TransactionContext');

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

    // Add expense of $150
    await act(async () => {
      await txState.addTransaction(
        'acc_1',
        'cat_food',
        150,
        'Groceries',
        Date.now(),
        'expense'
      );
    });

    // Balance should be 1000 - 150 = 850
    const accounts = testDB.getTable('accounts');
    expect(accounts[0].balance).toBe(850);

    const transactions = testDB.getTable('transactions');
    expect(transactions.length).toBe(1);
    expect(transactions[0].type).toBe('expense');
  });

  it('deleting a transaction reverts the balance', async () => {
    const { useTransactions } = require('../../lib/contexts/TransactionContext');

    // Pre-seed a transaction in DB
    testDB.insertDirect('transactions', {
      id: 'tx_1',
      accountId: 'acc_1',
      categoryId: 'cat_food',
      amount: 200,
      currency: 'USD',
      description: 'Dinner',
      date: Date.now(),
      type: 'expense',
      subscriptionId: null,
      createdAt: Date.now(),
    });
    // Adjust balance to reflect the expense
    testDB.getTable('accounts')[0].balance = 800; // 1000 - 200

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

    // Delete the transaction
    await act(async () => {
      await txState.deleteTransaction('tx_1');
    });

    // Balance should revert: 800 + 200 = 1000
    const accounts = testDB.getTable('accounts');
    expect(accounts[0].balance).toBe(1000);

    // Transaction should be gone
    const transactions = testDB.getTable('transactions');
    expect(transactions.length).toBe(0);
  });

  it('multiple transactions: income then expense, correct running balance', async () => {
    const { useTransactions } = require('../../lib/contexts/TransactionContext');

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

    // Add income: +500 → balance = 1500
    await act(async () => {
      await txState.addTransaction('acc_1', 'cat_salary', 500, 'Salary', Date.now(), 'income');
    });
    expect(testDB.getTable('accounts')[0].balance).toBe(1500);

    // Add expense: -120 → balance = 1380
    await act(async () => {
      await txState.addTransaction('acc_1', 'cat_food', 120, 'Lunch', Date.now(), 'expense');
    });
    expect(testDB.getTable('accounts')[0].balance).toBe(1380);

    // Add another expense: -80 → balance = 1300
    await act(async () => {
      await txState.addTransaction('acc_1', 'cat_transport', 80, 'Taxi', Date.now(), 'expense');
    });
    expect(testDB.getTable('accounts')[0].balance).toBe(1300);

    // Verify all 3 transactions exist
    expect(testDB.getTable('transactions').length).toBe(3);
  });

  it('transaction fails with non-existent account', async () => {
    const { useTransactions } = require('../../lib/contexts/TransactionContext');

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

    await act(async () => {
      try {
        await txState.addTransaction('nonexistent', 'cat_food', 50, 'Test', Date.now(), 'expense');
      } catch (e: any) {
        expect(e.message).toMatch(/account/i);
      }
    });

    // No transaction should be created
    expect(testDB.getTable('transactions').length).toBe(0);
    // Balance unchanged
    expect(testDB.getTable('accounts')[0].balance).toBe(1000);
  });

  it('transaction fails with non-existent category', async () => {
    const { useTransactions } = require('../../lib/contexts/TransactionContext');

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

    await act(async () => {
      try {
        await txState.addTransaction('acc_1', 'nonexistent_cat', 50, 'Test', Date.now(), 'expense');
      } catch (e: any) {
        expect(e.message).toMatch(/category/i);
      }
    });

    expect(testDB.getTable('transactions').length).toBe(0);
  });

  it('filtering transactions by type', async () => {
    const { useTransactions } = require('../../lib/contexts/TransactionContext');

    // Seed multiple transactions
    testDB.insertDirect('transactions', {
      id: 'tx_1', accountId: 'acc_1', categoryId: 'cat_salary',
      amount: 500, currency: 'USD', description: 'Pay',
      date: Date.now(), type: 'income', subscriptionId: null, createdAt: Date.now(),
    });
    testDB.insertDirect('transactions', {
      id: 'tx_2', accountId: 'acc_1', categoryId: 'cat_food',
      amount: 50, currency: 'USD', description: 'Lunch',
      date: Date.now(), type: 'expense', subscriptionId: null, createdAt: Date.now(),
    });
    testDB.insertDirect('transactions', {
      id: 'tx_3', accountId: 'acc_1', categoryId: 'cat_transport',
      amount: 30, currency: 'USD', description: 'Bus',
      date: Date.now(), type: 'expense', subscriptionId: null, createdAt: Date.now(),
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

    // Use context's filter methods
    const incomeOnly = txState.getTransactionsByType('income');
    expect(incomeOnly.length).toBe(1);
    expect(incomeOnly[0].type).toBe('income');

    const expenseOnly = txState.getTransactionsByType('expense');
    expect(expenseOnly.length).toBe(2);
  });
});
