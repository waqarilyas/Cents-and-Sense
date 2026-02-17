/**
 * E2E Test: Onboarding Flow
 *
 * Simulates a new user going through the complete onboarding process:
 * 1. App starts with no user profile → isLoading then onboarding state
 * 2. User sets their name and currency
 * 3. Default account is created automatically
 * 4. Onboarding is marked complete
 * 5. Subsequent loads restore the profile
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { testDB, setupDatabaseMock, resetAsyncStorage, createAppWrapper } from './helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Must set up DB mock BEFORE importing contexts
setupDatabaseMock();

describe('E2E: Onboarding Flow', () => {
  let AppWrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(async () => {
    testDB.reset();
    resetAsyncStorage();
    jest.clearAllMocks();
    AppWrapper = createAppWrapper();
  });

  it('starts with loading state and no user profile', async () => {
    const { useUser } = require('../../lib/contexts/UserContext');

    let userState: any = {};
    function Probe() {
      userState = useUser();
      return null;
    }

    await act(async () => {
      render(
        React.createElement(AppWrapper, null, React.createElement(Probe))
      );
    });

    // After init, user should not be onboarded
    await waitFor(() => {
      expect(userState.loading).toBe(false);
    });

    expect(userState.userName).toBeNull();
    expect(userState.isOnboardingComplete).toBe(false);
  });

  it('complete onboarding: set profile → account created → onboarding marked done', async () => {
    const { useUser } = require('../../lib/contexts/UserContext');
    const { useAccounts } = require('../../lib/contexts/AccountContext');
    const { useCurrency } = require('../../lib/contexts/CurrencyContext');

    let userState: any = {};
    let accountState: any = {};
    let currencyState: any = {};

    function Probe() {
      userState = useUser();
      accountState = useAccounts();
      currencyState = useCurrency();
      return null;
    }

    await act(async () => {
      render(
        React.createElement(AppWrapper, null, React.createElement(Probe))
      );
    });

    // Wait for loading to finish
    await waitFor(() => {
      expect(userState.loading).toBe(false);
    });

    // Step 1: Set user profile (simulates onboarding step 2 & 3)
    await act(async () => {
      await userState.setUserProfile('Alice', 'EUR');
    });

    // Step 2: Set the default currency
    await act(async () => {
      await currencyState.setDefaultCurrency('EUR');
    });

    // Step 3: Create the default account (simulates onboarding step 4)
    await act(async () => {
      await accountState.addAccount('My Account', 'checking', 'EUR');
    });

    // Step 4: Mark onboarding complete
    await act(async () => {
      await userState.completeOnboarding();
    });

    // Verify user profile is stored in DB
    const profileInDB = testDB.getTable('user_profile');
    expect(profileInDB.length).toBe(1);
    expect(profileInDB[0].name).toBe('Alice');
    expect(profileInDB[0].defaultCurrency).toBe('EUR');
    expect(profileInDB[0].onboardingCompleted).toBe(1);

    // Verify account was created
    const accountsInDB = testDB.getTable('accounts');
    expect(accountsInDB.length).toBe(1);
    expect(accountsInDB[0].name).toBe('My Account');
    expect(accountsInDB[0].type).toBe('checking');
    expect(accountsInDB[0].currency).toBe('EUR');
    expect(accountsInDB[0].balance).toBe(0);

    // Verify AsyncStorage has the onboarding flag
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@budget_app_onboarding_complete',
      'true'
    );

    // Verify currency was set
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@budget_app_currency',
      'EUR'
    );

    // Verify state reflects changes
    expect(userState.userName).toBe('Alice');
    expect(userState.isOnboardingComplete).toBe(true);
    expect(currencyState.defaultCurrencyCode).toBe('EUR');
  });

  it('updating user name after onboarding works', async () => {
    const { useUser } = require('../../lib/contexts/UserContext');

    // Pre-seed an existing user in DB
    testDB.insertDirect('user_profile', {
      id: 'user_profile_001',
      name: 'Alice',
      defaultCurrency: 'EUR',
      onboardingCompleted: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // AsyncStorage has onboarding flag
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@budget_app_onboarding_complete') return Promise.resolve('true');
      if (key === '@budget_app_currency') return Promise.resolve('EUR');
      return Promise.resolve(null);
    });

    let userState: any = {};
    function Probe() {
      userState = useUser();
      return null;
    }

    await act(async () => {
      render(
        React.createElement(AppWrapper, null, React.createElement(Probe))
      );
    });

    await waitFor(() => {
      expect(userState.loading).toBe(false);
    });

    expect(userState.userName).toBe('Alice');
    expect(userState.isOnboardingComplete).toBe(true);

    // Update the name
    await act(async () => {
      await userState.updateUserName('Bob');
    });

    expect(userState.userName).toBe('Bob');

    // Verify DB was updated
    const profile = testDB.getTable('user_profile');
    expect(profile[0].name).toBe('Bob');
  });

  it('restoring profile from DB on app restart', async () => {
    const { useUser } = require('../../lib/contexts/UserContext');
    const { useCurrency } = require('../../lib/contexts/CurrencyContext');

    // Simulate existing DB state (as if user previously completed onboarding)
    testDB.insertDirect('user_profile', {
      id: 'user_profile_001',
      name: 'Charlie',
      defaultCurrency: 'GBP',
      onboardingCompleted: 1,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
    });

    testDB.insertDirect('accounts', {
      id: 'acc_1',
      name: 'Main Account',
      type: 'checking',
      balance: 1500.50,
      currency: 'GBP',
      isDefault: 1,
      createdAt: Date.now() - 86400000,
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@budget_app_onboarding_complete') return Promise.resolve('true');
      if (key === '@budget_app_currency') return Promise.resolve('GBP');
      if (key === '@budget_tracker_settings') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    let userState: any = {};
    let currencyState: any = {};

    function Probe() {
      userState = useUser();
      currencyState = useCurrency();
      return null;
    }

    await act(async () => {
      render(
        React.createElement(AppWrapper, null, React.createElement(Probe))
      );
    });

    await waitFor(() => {
      expect(userState.loading).toBe(false);
    });

    // Profile should be restored
    expect(userState.userName).toBe('Charlie');
    expect(userState.defaultCurrency).toBe('GBP');
    expect(userState.isOnboardingComplete).toBe(true);
    expect(currencyState.defaultCurrencyCode).toBe('GBP');
  });
});
