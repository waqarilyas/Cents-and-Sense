/**
 * E2E Test: Budget Management
 *
 * Tests budget creation, tracking, and monthly budget flows:
 * 1. Create per-category budgets
 * 2. Set monthly overall budget
 * 3. Budget spending is tracked via transactions
 * 4. Budget with enhanced data (includes spending)
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { testDB, setupDatabaseMock, resetAsyncStorage, createAppWrapper } from './helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

setupDatabaseMock();

describe('E2E: Budget Management', () => {
  let AppWrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(async () => {
    testDB.reset();
    resetAsyncStorage();
    jest.clearAllMocks();

    // Post-onboarding state
    testDB.insertDirect('user_profile', {
      id: 'user_profile_001', name: 'Alice', defaultCurrency: 'USD',
      onboardingCompleted: 1, createdAt: Date.now(), updatedAt: Date.now(),
    });

    testDB.insertDirect('accounts', {
      id: 'acc_1', name: 'Checking', type: 'checking',
      balance: 5000, currency: 'USD', isDefault: 1, createdAt: Date.now(),
    });

    testDB.insertDirect('categories', {
      id: 'cat_food', name: 'Food', type: 'expense', color: '#FF5722', createdAt: Date.now(),
    });

    testDB.insertDirect('categories', {
      id: 'cat_transport', name: 'Transport', type: 'expense', color: '#2196F3', createdAt: Date.now(),
    });

    testDB.insertDirect('categories', {
      id: 'cat_entertainment', name: 'Entertainment', type: 'expense', color: '#9C27B0', createdAt: Date.now(),
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@budget_app_onboarding_complete') return Promise.resolve('true');
      if (key === '@budget_app_currency') return Promise.resolve('USD');
      return Promise.resolve(null);
    });

    AppWrapper = createAppWrapper();
  });

  it('creates a per-category budget', async () => {
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

    // Create a food budget of $300/month
    await act(async () => {
      await budgetState.addBudget('cat_food', 300, 'monthly', 'USD');
    });

    const budgets = testDB.getTable('budgets');
    expect(budgets.length).toBe(1);
    expect(budgets[0].categoryId).toBe('cat_food');
    expect(budgets[0].budget_limit).toBe(300);
    expect(budgets[0].period).toBe('monthly');
    expect(budgets[0].currency).toBe('USD');
    expect(budgets[0].allowCarryover).toBe(1);
  });

  it('creates multiple per-category budgets', async () => {
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
      await budgetState.addBudget('cat_transport', 150, 'monthly', 'USD');
    });

    await act(async () => {
      await budgetState.addBudget('cat_entertainment', 100, 'monthly', 'USD');
    });

    const budgets = testDB.getTable('budgets');
    expect(budgets.length).toBe(3);

    // State should also reflect all budgets
    expect(budgetState.budgets.length).toBe(3);
  });

  it('updates a budget limit', async () => {
    const { useBudgets } = require('../../lib/contexts/BudgetContext');

    // Pre-seed a budget
    testDB.insertDirect('budgets', {
      id: 'budget_1', categoryId: 'cat_food', budget_limit: 300,
      currency: 'USD', period: 'monthly', allowCarryover: 1,
      lastCarryoverAmount: 0, lastPeriodEnd: 0, createdAt: Date.now(),
    });

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

    // Update the food budget to $400
    await act(async () => {
      await budgetState.updateBudget('budget_1', 400, 'monthly', 'USD');
    });

    const budgets = testDB.getTable('budgets');
    expect(budgets[0].budget_limit).toBe(400);
  });

  it('deletes a budget', async () => {
    const { useBudgets } = require('../../lib/contexts/BudgetContext');

    testDB.insertDirect('budgets', {
      id: 'budget_1', categoryId: 'cat_food', budget_limit: 300,
      currency: 'USD', period: 'monthly', allowCarryover: 1,
      lastCarryoverAmount: 0, lastPeriodEnd: 0, createdAt: Date.now(),
    });

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
      await budgetState.deleteBudget('budget_1');
    });

    expect(testDB.getTable('budgets').length).toBe(0);
    expect(budgetState.budgets.length).toBe(0);
  });

  it('sets and clears a monthly overall budget', async () => {
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

    // Set monthly budget of $2000
    const now = new Date();
    await act(async () => {
      await budgetState.setMonthlyBudget(2000, 'USD');
    });

    // Monthly budget should be stored in DB
    const monthlyBudgets = testDB.getTable('monthly_budgets');
    expect(monthlyBudgets.length).toBe(1);
    expect(monthlyBudgets[0].amount).toBe(2000);
    expect(monthlyBudgets[0].currency).toBe('USD');

    // State should reflect it
    expect(budgetState.monthlyBudget).toBeTruthy();
    expect(budgetState.monthlyBudget.amount).toBe(2000);

    // Clear the monthly budget
    await act(async () => {
      await budgetState.clearMonthlyBudget();
    });

    expect(testDB.getTable('monthly_budgets').length).toBe(0);
    expect(budgetState.monthlyBudget).toBeNull();
  });

  it('budget fails for non-existent category', async () => {
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
      try {
        await budgetState.addBudget('nonexistent_cat', 300, 'monthly', 'USD');
      } catch (e: any) {
        expect(e.message).toMatch(/category/i);
      }
    });

    expect(testDB.getTable('budgets').length).toBe(0);
  });

  it('toggles carryover on a budget', async () => {
    const { useBudgets } = require('../../lib/contexts/BudgetContext');

    testDB.insertDirect('budgets', {
      id: 'budget_1', categoryId: 'cat_food', budget_limit: 300,
      currency: 'USD', period: 'monthly', allowCarryover: 1,
      lastCarryoverAmount: 0, lastPeriodEnd: 0, createdAt: Date.now(),
    });

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

    // Toggle carryover off
    await act(async () => {
      await budgetState.toggleBudgetCarryover('budget_1', false);
    });

    const budgets = testDB.getTable('budgets');
    expect(budgets[0].allowCarryover).toBe(0);

    // Toggle back on
    await act(async () => {
      await budgetState.toggleBudgetCarryover('budget_1', true);
    });

    expect(testDB.getTable('budgets')[0].allowCarryover).toBe(1);
  });
});
