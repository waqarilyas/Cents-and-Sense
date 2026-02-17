/**
 * E2E Test: Goals Lifecycle
 *
 * Tests creating, updating progress, and completing savings goals:
 * 1. Create a goal with target amount and deadline
 * 2. Make contributions (update progress)
 * 3. Track completion percentage
 * 4. Update goal details
 * 5. Delete a goal
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { testDB, setupDatabaseMock, resetAsyncStorage, createAppWrapper } from './helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

setupDatabaseMock();

describe('E2E: Goals Lifecycle', () => {
  let AppWrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(async () => {
    testDB.reset();
    resetAsyncStorage();
    jest.clearAllMocks();

    testDB.insertDirect('user_profile', {
      id: 'user_profile_001', name: 'Alice', defaultCurrency: 'USD',
      onboardingCompleted: 1, createdAt: Date.now(), updatedAt: Date.now(),
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@budget_app_onboarding_complete') return Promise.resolve('true');
      if (key === '@budget_app_currency') return Promise.resolve('USD');
      return Promise.resolve(null);
    });

    AppWrapper = createAppWrapper();
  });

  it('creates a savings goal', async () => {
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

    const deadline = Date.now() + 90 * 86400000; // 90 days from now
    await act(async () => {
      await goalState.addGoal('Emergency Fund', 5000, deadline, 'USD');
    });

    const goals = testDB.getTable('goals');
    expect(goals.length).toBe(1);
    expect(goals[0].name).toBe('Emergency Fund');
    expect(goals[0].targetAmount).toBe(5000);
    expect(goals[0].currentAmount).toBe(0);
    expect(goals[0].currency).toBe('USD');

    expect(goalState.goals.length).toBe(1);
  });

  it('updates goal progress step by step', async () => {
    const { useGoals } = require('../../lib/contexts/GoalContext');

    const deadline = Date.now() + 90 * 86400000;
    testDB.insertDirect('goals', {
      id: 'goal_1', name: 'Vacation', targetAmount: 2000,
      currentAmount: 0, currency: 'USD', deadline, createdAt: Date.now(),
    });

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

    // First contribution: $500
    await act(async () => {
      await goalState.updateGoalProgress('goal_1', 500);
    });

    expect(testDB.getTable('goals')[0].currentAmount).toBe(500);

    // Second contribution: $300 (total: $800)
    await act(async () => {
      await goalState.updateGoalProgress('goal_1', 800);
    });

    expect(testDB.getTable('goals')[0].currentAmount).toBe(800);

    // Complete the goal: $2000
    await act(async () => {
      await goalState.updateGoalProgress('goal_1', 2000);
    });

    const goal = testDB.getTable('goals')[0];
    expect(goal.currentAmount).toBe(2000);
    expect(goal.currentAmount).toBe(goal.targetAmount); // Goal reached!
  });

  it('updates goal details (name, target, deadline)', async () => {
    const { useGoals } = require('../../lib/contexts/GoalContext');

    const deadline = Date.now() + 90 * 86400000;
    testDB.insertDirect('goals', {
      id: 'goal_1', name: 'Vacation', targetAmount: 2000,
      currentAmount: 500, currency: 'USD', deadline, createdAt: Date.now(),
    });

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

    const newDeadline = Date.now() + 180 * 86400000;
    await act(async () => {
      await goalState.updateGoal('goal_1', 'Dream Vacation', 3000, 500, newDeadline, 'USD');
    });

    const goal = testDB.getTable('goals')[0];
    expect(goal.name).toBe('Dream Vacation');
    expect(goal.targetAmount).toBe(3000);
    expect(goal.currentAmount).toBe(500); // Progress preserved
  });

  it('deletes a goal', async () => {
    const { useGoals } = require('../../lib/contexts/GoalContext');

    testDB.insertDirect('goals', {
      id: 'goal_1', name: 'Car', targetAmount: 15000,
      currentAmount: 3000, currency: 'USD', deadline: Date.now() + 365 * 86400000,
      createdAt: Date.now(),
    });

    testDB.insertDirect('goals', {
      id: 'goal_2', name: 'House', targetAmount: 50000,
      currentAmount: 10000, currency: 'USD', deadline: Date.now() + 1825 * 86400000,
      createdAt: Date.now(),
    });

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

    expect(goalState.goals.length).toBe(2);

    await act(async () => {
      await goalState.deleteGoal('goal_1');
    });

    expect(testDB.getTable('goals').length).toBe(1);
    expect(testDB.getTable('goals')[0].id).toBe('goal_2');
    expect(goalState.goals.length).toBe(1);
  });

  it('manages multiple goals simultaneously', async () => {
    const { useGoals } = require('../../lib/contexts/GoalContext');

    // Insert goals directly with known unique IDs to avoid Date.now() collision
    testDB.insertDirect('goals', {
      id: 'goal_ef', name: 'Emergency Fund', targetAmount: 5000,
      currentAmount: 0, currency: 'USD', deadline: Date.now() + 90 * 86400000,
      createdAt: Date.now() - 3,
    });
    testDB.insertDirect('goals', {
      id: 'goal_vac', name: 'Vacation', targetAmount: 2000,
      currentAmount: 0, currency: 'USD', deadline: Date.now() + 180 * 86400000,
      createdAt: Date.now() - 2,
    });
    testDB.insertDirect('goals', {
      id: 'goal_lap', name: 'New Laptop', targetAmount: 1500,
      currentAmount: 0, currency: 'USD', deadline: Date.now() + 60 * 86400000,
      createdAt: Date.now() - 1,
    });

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

    expect(goalState.goals.length).toBe(3);
    expect(testDB.getTable('goals').length).toBe(3);

    // Make progress on each
    await act(async () => {
      await goalState.updateGoalProgress('goal_ef', 1000);
    });
    await act(async () => {
      await goalState.updateGoalProgress('goal_vac', 500);
    });
    await act(async () => {
      await goalState.updateGoalProgress('goal_lap', 1500); // Complete!
    });

    const updatedGoals = testDB.getTable('goals');
    expect(updatedGoals.find((g: any) => g.name === 'Emergency Fund').currentAmount).toBe(1000);
    expect(updatedGoals.find((g: any) => g.name === 'Vacation').currentAmount).toBe(500);
    expect(updatedGoals.find((g: any) => g.name === 'New Laptop').currentAmount).toBe(1500);
  });
});
