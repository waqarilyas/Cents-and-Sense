/**
 * E2E Test: Subscriptions Flow
 *
 * Tests the full subscription lifecycle including auto-processing:
 * 1. Create a subscription
 * 2. Process subscriptions in auto mode (creates transactions, updates balance)
 * 3. Skip a subscription payment
 * 4. Toggle active/inactive
 * 5. Monthly total calculation
 * 6. Upcoming subscriptions tracking
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { testDB, setupDatabaseMock, resetAsyncStorage, createAppWrapper } from './helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

setupDatabaseMock();

describe('E2E: Subscriptions Flow', () => {
  let AppWrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(async () => {
    testDB.reset();
    resetAsyncStorage();
    jest.clearAllMocks();

    testDB.insertDirect('user_profile', {
      id: 'user_profile_001', name: 'Alice', defaultCurrency: 'USD',
      onboardingCompleted: 1, createdAt: Date.now(), updatedAt: Date.now(),
    });

    testDB.insertDirect('accounts', {
      id: 'acc_1', name: 'Checking', type: 'checking',
      balance: 3000, currency: 'USD', isDefault: 1, createdAt: Date.now(),
    });

    testDB.insertDirect('categories', {
      id: 'cat_entertainment', name: 'Entertainment', type: 'expense',
      color: '#9C27B0', createdAt: Date.now(),
    });

    testDB.insertDirect('categories', {
      id: 'cat_utilities', name: 'Utilities', type: 'expense',
      color: '#607D8B', createdAt: Date.now(),
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@budget_app_onboarding_complete') return Promise.resolve('true');
      if (key === '@budget_app_currency') return Promise.resolve('USD');
      return Promise.resolve(null);
    });

    AppWrapper = createAppWrapper();
  });

  it('creates a subscription', async () => {
    const { useSubscriptions } = require('../../lib/contexts/SubscriptionContext');

    let subState: any = {};

    function Probe() {
      subState = useSubscriptions();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(subState.loading).toBe(false);
    });

    const startDate = Date.now() - 30 * 86400000; // Started 30 days ago
    await act(async () => {
      await subState.addSubscription(
        'Netflix',
        15.99,
        'cat_entertainment',
        'monthly',
        startDate,
        'USD',
        3,      // reminderDays
        'Streaming service'  // notes
      );
    });

    const subs = testDB.getTable('subscriptions');
    expect(subs.length).toBe(1);
    expect(subs[0].name).toBe('Netflix');
    expect(subs[0].amount).toBe(15.99);
    expect(subs[0].frequency).toBe('monthly');
    expect(subs[0].isActive).toBe(1);
    expect(subs[0].categoryId).toBe('cat_entertainment');

    expect(subState.subscriptions.length).toBe(1);
  });

  it('processes a due subscription in auto mode → creates transaction + updates balance', async () => {
    const { useSubscriptions } = require('../../lib/contexts/SubscriptionContext');

    // Create a subscription that's already past due
    const pastDueDate = Date.now() - 5 * 86400000; // 5 days ago
    testDB.insertDirect('subscriptions', {
      id: 'sub_1', name: 'Netflix', amount: 15.99, currency: 'USD',
      categoryId: 'cat_entertainment', frequency: 'monthly',
      startDate: pastDueDate - 30 * 86400000,
      nextDueDate: pastDueDate,
      isActive: 1, reminderDays: 3, notes: '', createdAt: Date.now(),
    });

    let subState: any = {};

    function Probe() {
      subState = useSubscriptions();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(subState.loading).toBe(false);
    });

    // Process subscriptions in auto mode
    await act(async () => {
      await subState.processDueSubscriptions('auto');
    });

    // A transaction should have been created
    const transactions = testDB.getTable('transactions');
    expect(transactions.length).toBeGreaterThanOrEqual(1);

    const subTx = transactions.find((t: any) => t.subscriptionId === 'sub_1');
    expect(subTx).toBeTruthy();
    expect(subTx.amount).toBe(15.99);
    expect(subTx.type).toBe('expense');
    expect(subTx.categoryId).toBe('cat_entertainment');

    // Account balance should have decreased
    const accounts = testDB.getTable('accounts');
    expect(accounts[0].balance).toBeLessThan(3000);

    // Next due date should have been advanced
    const subs = testDB.getTable('subscriptions');
    expect(subs[0].nextDueDate).toBeGreaterThan(pastDueDate);
  });

  it('skipping a pending subscription does not create a transaction', async () => {
    const { useSubscriptions } = require('../../lib/contexts/SubscriptionContext');

    const pastDueDate = Date.now() - 2 * 86400000;
    testDB.insertDirect('subscriptions', {
      id: 'sub_1', name: 'Gym', amount: 50, currency: 'USD',
      categoryId: 'cat_entertainment', frequency: 'monthly',
      startDate: pastDueDate - 30 * 86400000,
      nextDueDate: pastDueDate,
      isActive: 1, reminderDays: 3, notes: '', createdAt: Date.now(),
    });

    let subState: any = {};

    function Probe() {
      subState = useSubscriptions();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(subState.loading).toBe(false);
    });

    // Process in manual mode → adds to pending list (no transaction yet)
    await act(async () => {
      await subState.processDueSubscriptions('manual');
    });

    expect(subState.pendingSubscriptions.length).toBe(1);

    // Skip the pending subscription
    await act(async () => {
      await subState.skipPendingSubscription('sub_1');
    });

    // No transaction should be created
    expect(testDB.getTable('transactions').length).toBe(0);

    // Pending list should be cleared
    expect(subState.pendingSubscriptions.length).toBe(0);

    // Balance unchanged
    expect(testDB.getTable('accounts')[0].balance).toBe(3000);
  });

  it('toggles subscription active/inactive', async () => {
    const { useSubscriptions } = require('../../lib/contexts/SubscriptionContext');

    testDB.insertDirect('subscriptions', {
      id: 'sub_1', name: 'Spotify', amount: 9.99, currency: 'USD',
      categoryId: 'cat_entertainment', frequency: 'monthly',
      startDate: Date.now(), nextDueDate: Date.now() + 30 * 86400000,
      isActive: 1, reminderDays: 3, notes: '', createdAt: Date.now(),
    });

    let subState: any = {};

    function Probe() {
      subState = useSubscriptions();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(subState.loading).toBe(false);
    });

    // Toggle inactive
    await act(async () => {
      await subState.toggleSubscription('sub_1');
    });

    expect(testDB.getTable('subscriptions')[0].isActive).toBe(0);

    // Toggle back to active
    await act(async () => {
      await subState.toggleSubscription('sub_1');
    });

    expect(testDB.getTable('subscriptions')[0].isActive).toBe(1);
  });

  it('calculates monthly total across subscriptions', async () => {
    const { useSubscriptions } = require('../../lib/contexts/SubscriptionContext');

    // Monthly: $15.99
    testDB.insertDirect('subscriptions', {
      id: 'sub_1', name: 'Netflix', amount: 15.99, currency: 'USD',
      categoryId: 'cat_entertainment', frequency: 'monthly',
      startDate: Date.now(), nextDueDate: Date.now() + 30 * 86400000,
      isActive: 1, reminderDays: 3, notes: '', createdAt: Date.now(),
    });

    // Yearly: $120 → monthly equiv = $10
    testDB.insertDirect('subscriptions', {
      id: 'sub_2', name: 'Domain', amount: 120, currency: 'USD',
      categoryId: 'cat_utilities', frequency: 'yearly',
      startDate: Date.now(), nextDueDate: Date.now() + 365 * 86400000,
      isActive: 1, reminderDays: 3, notes: '', createdAt: Date.now(),
    });

    // Inactive — should not count
    testDB.insertDirect('subscriptions', {
      id: 'sub_3', name: 'Old Service', amount: 50, currency: 'USD',
      categoryId: 'cat_utilities', frequency: 'monthly',
      startDate: Date.now(), nextDueDate: Date.now() + 30 * 86400000,
      isActive: 0, reminderDays: 3, notes: '', createdAt: Date.now(),
    });

    let subState: any = {};

    function Probe() {
      subState = useSubscriptions();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(subState.loading).toBe(false);
    });

    const monthlyTotal = subState.getMonthlyTotal();
    // Netflix ($15.99/mo) + Domain ($120/yr = $10/mo) = ~$25.99
    expect(monthlyTotal).toBeCloseTo(25.99, 1);
  });

  it('deletes a subscription', async () => {
    const { useSubscriptions } = require('../../lib/contexts/SubscriptionContext');

    testDB.insertDirect('subscriptions', {
      id: 'sub_1', name: 'Netflix', amount: 15.99, currency: 'USD',
      categoryId: 'cat_entertainment', frequency: 'monthly',
      startDate: Date.now(), nextDueDate: Date.now() + 30 * 86400000,
      isActive: 1, reminderDays: 3, notes: '', createdAt: Date.now(),
    });

    let subState: any = {};

    function Probe() {
      subState = useSubscriptions();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(subState.loading).toBe(false);
    });

    await act(async () => {
      await subState.deleteSubscription('sub_1');
    });

    expect(testDB.getTable('subscriptions').length).toBe(0);
    expect(subState.subscriptions.length).toBe(0);
  });

  it('subscription fails for non-existent category', async () => {
    const { useSubscriptions } = require('../../lib/contexts/SubscriptionContext');

    let subState: any = {};

    function Probe() {
      subState = useSubscriptions();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(subState.loading).toBe(false);
    });

    await act(async () => {
      try {
        await subState.addSubscription(
          'Test', 10, 'nonexistent_cat', 'monthly',
          Date.now(), 'USD', 3, ''
        );
      } catch (e: any) {
        expect(e.message).toMatch(/category/i);
      }
    });

    expect(testDB.getTable('subscriptions').length).toBe(0);
  });
});
