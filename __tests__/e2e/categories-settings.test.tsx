/**
 * E2E Test: Categories & Settings
 *
 * Tests category management and settings persistence:
 * 1. Default categories are seeded on first load
 * 2. Add custom categories
 * 3. Update categories
 * 4. Deletion protection (can't delete if linked to budgets/subscriptions)
 * 5. Settings persist and restore
 * 6. Account management (CRUD, default switching)
 */
import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import {
  testDB,
  setupDatabaseMock,
  resetAsyncStorage,
  createAppWrapper,
} from "./helpers";
import AsyncStorage from "@react-native-async-storage/async-storage";

setupDatabaseMock();

describe("E2E: Categories & Settings", () => {
  let AppWrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(async () => {
    testDB.reset();
    resetAsyncStorage();
    jest.clearAllMocks();

    testDB.insertDirect("user_profile", {
      id: "user_profile_001",
      name: "Alice",
      defaultCurrency: "USD",
      onboardingCompleted: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@budget_app_onboarding_complete")
        return Promise.resolve("true");
      if (key === "@budget_app_currency") return Promise.resolve("USD");
      return Promise.resolve(null);
    });

    AppWrapper = createAppWrapper();
  });

  it("adds a custom category", async () => {
    const { useCategories } = require("../../lib/contexts/CategoryContext");

    // Pre-seed one category so seeding doesn't kick in
    testDB.insertDirect("categories", {
      id: "cat_food",
      name: "Food",
      type: "expense",
      color: "#FF5722",
      createdAt: Date.now(),
    });

    let catState: any = {};

    function Probe() {
      catState = useCategories();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(catState.loading).toBe(false);
    });

    await act(async () => {
      await catState.addCategory("Pet Care", "expense", "#E91E63");
    });

    const categories = testDB.getTable("categories");
    const petCare = categories.find((c: any) => c.name === "Pet Care");
    expect(petCare).toBeTruthy();
    expect(petCare.type).toBe("expense");
    expect(petCare.color).toBe("#E91E63");
  });

  it("updates a category", async () => {
    const { useCategories } = require("../../lib/contexts/CategoryContext");

    testDB.insertDirect("categories", {
      id: "cat_food",
      name: "Food",
      type: "expense",
      color: "#FF5722",
      createdAt: Date.now(),
    });

    let catState: any = {};

    function Probe() {
      catState = useCategories();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(catState.loading).toBe(false);
    });

    await act(async () => {
      await catState.updateCategory("cat_food", "Groceries", "#4CAF50");
    });

    const cat = testDB
      .getTable("categories")
      .find((c: any) => c.id === "cat_food");
    expect(cat.name).toBe("Groceries");
    expect(cat.color).toBe("#4CAF50");
  });

  it("prevents deleting a category linked to a budget", async () => {
    const { useCategories } = require("../../lib/contexts/CategoryContext");

    testDB.insertDirect("categories", {
      id: "cat_food",
      name: "Food",
      type: "expense",
      color: "#FF5722",
      createdAt: Date.now(),
    });

    // Link it to a budget
    testDB.insertDirect("budgets", {
      id: "budget_1",
      categoryId: "cat_food",
      budget_limit: 300,
      currency: "USD",
      period: "monthly",
      allowCarryover: 1,
      lastCarryoverAmount: 0,
      lastPeriodEnd: 0,
      createdAt: Date.now(),
    });

    let catState: any = {};

    function Probe() {
      catState = useCategories();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(catState.loading).toBe(false);
    });

    await act(async () => {
      try {
        await catState.deleteCategory("cat_food");
        // Should not reach here
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toMatch(/budget|subscription/i);
      }
    });

    // Category should still exist
    expect(testDB.getTable("categories").length).toBe(1);
  });

  it("prevents deleting a category linked to a subscription", async () => {
    const { useCategories } = require("../../lib/contexts/CategoryContext");

    testDB.insertDirect("categories", {
      id: "cat_ent",
      name: "Entertainment",
      type: "expense",
      color: "#9C27B0",
      createdAt: Date.now(),
    });

    testDB.insertDirect("subscriptions", {
      id: "sub_1",
      name: "Netflix",
      amount: 15.99,
      currency: "USD",
      categoryId: "cat_ent",
      frequency: "monthly",
      startDate: Date.now(),
      nextDueDate: Date.now() + 30 * 86400000,
      isActive: 1,
      reminderDays: 3,
      notes: "",
      createdAt: Date.now(),
    });

    let catState: any = {};

    function Probe() {
      catState = useCategories();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(catState.loading).toBe(false);
    });

    await act(async () => {
      try {
        await catState.deleteCategory("cat_ent");
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toMatch(/budget|subscription/i);
      }
    });

    expect(testDB.getTable("categories").length).toBe(1);
  });

  it("deletes an unlinked category successfully", async () => {
    const { useCategories } = require("../../lib/contexts/CategoryContext");

    testDB.insertDirect("categories", {
      id: "cat_1",
      name: "Temp Category",
      type: "expense",
      color: "#ccc",
      createdAt: Date.now(),
    });
    testDB.insertDirect("categories", {
      id: "cat_2",
      name: "Keep Me",
      type: "income",
      color: "#aaa",
      createdAt: Date.now(),
    });

    let catState: any = {};

    function Probe() {
      catState = useCategories();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(catState.loading).toBe(false);
    });

    await act(async () => {
      await catState.deleteCategory("cat_1");
    });

    expect(testDB.getTable("categories").length).toBe(1);
    expect(testDB.getTable("categories")[0].name).toBe("Keep Me");
  });

  it("separates income and expense categories", async () => {
    const { useCategories } = require("../../lib/contexts/CategoryContext");

    testDB.insertDirect("categories", {
      id: "cat_1",
      name: "Salary",
      type: "income",
      color: "#4CAF50",
      createdAt: Date.now(),
    });
    testDB.insertDirect("categories", {
      id: "cat_2",
      name: "Freelance",
      type: "income",
      color: "#8BC34A",
      createdAt: Date.now(),
    });
    testDB.insertDirect("categories", {
      id: "cat_3",
      name: "Food",
      type: "expense",
      color: "#FF5722",
      createdAt: Date.now(),
    });

    let catState: any = {};

    function Probe() {
      catState = useCategories();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(catState.loading).toBe(false);
    });

    expect(catState.incomeCategories.length).toBe(2);
    expect(catState.expenseCategories.length).toBe(1);
  });
});

describe("E2E: Settings Persistence", () => {
  let AppWrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(async () => {
    testDB.reset();
    resetAsyncStorage();
    jest.clearAllMocks();

    testDB.insertDirect("user_profile", {
      id: "user_profile_001",
      name: "Alice",
      defaultCurrency: "USD",
      onboardingCompleted: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@budget_app_onboarding_complete")
        return Promise.resolve("true");
      if (key === "@budget_app_currency") return Promise.resolve("USD");
      return Promise.resolve(null);
    });

    AppWrapper = createAppWrapper();
  });

  it("updates and persists settings", async () => {
    const { useSettings } = require("../../lib/contexts/SettingsContext");

    let settingsState: any = {};

    function Probe() {
      settingsState = useSettings();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(settingsState.loading).toBe(false);
    });

    // Verify defaults
    expect(settingsState.settings.subscriptionProcessingMode).toBe("notify");
    expect(settingsState.settings.theme).toBe("system");

    // Update settings
    await act(async () => {
      await settingsState.updateSettings({
        subscriptionProcessingMode: "auto",
        theme: "dark",
        budgetPeriodStartDay: 15,
      });
    });

    expect(settingsState.settings.subscriptionProcessingMode).toBe("auto");
    expect(settingsState.settings.theme).toBe("dark");
    expect(settingsState.settings.budgetPeriodStartDay).toBe(15);

    // Check AsyncStorage was called
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@budget_tracker_settings",
      expect.any(String),
    );
  });

  it("restores saved settings on reload", async () => {
    const { useSettings } = require("../../lib/contexts/SettingsContext");

    const savedSettings = JSON.stringify({
      subscriptionProcessingMode: "manual",
      notificationsEnabled: false,
      subscriptionReminderDays: 7,
      defaultCurrencyCode: "EUR",
      theme: "dark",
      budgetPeriodStartDay: 10,
      enableBudgetCarryover: false,
      hideBalances: false,
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@budget_tracker_settings")
        return Promise.resolve(savedSettings);
      if (key === "@budget_app_onboarding_complete")
        return Promise.resolve("true");
      if (key === "@budget_app_currency") return Promise.resolve("EUR");
      return Promise.resolve(null);
    });

    let settingsState: any = {};

    function Probe() {
      settingsState = useSettings();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(settingsState.loading).toBe(false);
    });

    expect(settingsState.settings.subscriptionProcessingMode).toBe("manual");
    expect(settingsState.settings.theme).toBe("dark");
    expect(settingsState.settings.budgetPeriodStartDay).toBe(10);
    expect(settingsState.settings.enableBudgetCarryover).toBe(false);
  });

  it("resets settings to defaults", async () => {
    const { useSettings } = require("../../lib/contexts/SettingsContext");

    const savedSettings = JSON.stringify({
      subscriptionProcessingMode: "manual",
      theme: "dark",
      budgetPeriodStartDay: 15,
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@budget_tracker_settings")
        return Promise.resolve(savedSettings);
      if (key === "@budget_app_onboarding_complete")
        return Promise.resolve("true");
      return Promise.resolve(null);
    });

    let settingsState: any = {};

    function Probe() {
      settingsState = useSettings();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(settingsState.loading).toBe(false);
    });

    // Reset
    await act(async () => {
      await settingsState.resetSettings();
    });

    expect(settingsState.settings.subscriptionProcessingMode).toBe("notify");
    expect(settingsState.settings.theme).toBe("system");
    expect(settingsState.settings.budgetPeriodStartDay).toBe(1);
  });
});

describe("E2E: Account Management", () => {
  let AppWrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(async () => {
    testDB.reset();
    resetAsyncStorage();
    jest.clearAllMocks();

    testDB.insertDirect("user_profile", {
      id: "user_profile_001",
      name: "Alice",
      defaultCurrency: "USD",
      onboardingCompleted: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@budget_app_onboarding_complete")
        return Promise.resolve("true");
      if (key === "@budget_app_currency") return Promise.resolve("USD");
      return Promise.resolve(null);
    });

    AppWrapper = createAppWrapper();
  });

  it("creates an account with zero balance", async () => {
    const { useAccounts } = require("../../lib/contexts/AccountContext");

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
      await accState.addAccount("My Checking", "checking", "USD");
    });

    const accounts = testDB.getTable("accounts");
    expect(accounts.length).toBe(1);
    expect(accounts[0].balance).toBe(0);
    expect(accounts[0].name).toBe("My Checking");
    expect(accounts[0].isDefault).toBe(1); // First account becomes default
  });

  it("updates an account name and type", async () => {
    const { useAccounts } = require("../../lib/contexts/AccountContext");

    testDB.insertDirect("accounts", {
      id: "acc_1",
      name: "Old Name",
      type: "checking",
      balance: 1000,
      currency: "USD",
      isDefault: 1,
      createdAt: Date.now(),
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

    await act(async () => {
      await accState.updateAccount("acc_1", "New Name", 1000);
    });

    const acc = testDB.getTable("accounts")[0];
    expect(acc.name).toBe("New Name");
    expect(acc.balance).toBe(1000); // Balance unchanged
  });

  it("switches default account", async () => {
    const { useAccounts } = require("../../lib/contexts/AccountContext");

    testDB.insertDirect("accounts", {
      id: "acc_1",
      name: "Primary",
      type: "checking",
      balance: 1000,
      currency: "USD",
      isDefault: 1,
      createdAt: Date.now(),
    });
    testDB.insertDirect("accounts", {
      id: "acc_2",
      name: "Secondary",
      type: "savings",
      balance: 5000,
      currency: "USD",
      isDefault: 0,
      createdAt: Date.now(),
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

    await act(async () => {
      await accState.setDefaultAccount("acc_2");
    });

    const accounts = testDB.getTable("accounts");
    const primary = accounts.find((a: any) => a.id === "acc_1");
    const secondary = accounts.find((a: any) => a.id === "acc_2");
    expect(primary.isDefault).toBe(0);
    expect(secondary.isDefault).toBe(1);
  });

  it("deleting an account also removes its transactions", async () => {
    const { useAccounts } = require("../../lib/contexts/AccountContext");

    testDB.insertDirect("accounts", {
      id: "acc_1",
      name: "Primary",
      type: "checking",
      balance: 1000,
      currency: "USD",
      isDefault: 1,
      createdAt: Date.now(),
    });
    testDB.insertDirect("accounts", {
      id: "acc_2",
      name: "To Delete",
      type: "savings",
      balance: 500,
      currency: "USD",
      isDefault: 0,
      createdAt: Date.now(),
    });

    // Transaction linked to acc_2
    testDB.insertDirect("transactions", {
      id: "tx_1",
      accountId: "acc_2",
      categoryId: "cat_food",
      amount: 50,
      currency: "USD",
      description: "Test",
      date: Date.now(),
      type: "expense",
      subscriptionId: null,
      createdAt: Date.now(),
    });

    testDB.insertDirect("categories", {
      id: "cat_food",
      name: "Food",
      type: "expense",
      color: "#FF5722",
      createdAt: Date.now(),
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

    await act(async () => {
      await accState.deleteAccount("acc_2");
    });

    // Account gone
    expect(testDB.getTable("accounts").length).toBe(1);
    expect(testDB.getTable("accounts")[0].id).toBe("acc_1");

    // Transaction also gone
    expect(testDB.getTable("transactions").length).toBe(0);
  });
});
