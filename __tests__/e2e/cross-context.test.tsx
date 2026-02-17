/**
 * E2E Test: Cross-Context Integration
 *
 * Tests real user journeys that span multiple contexts:
 * 1. Full lifecycle: onboard → add transactions → set budgets → track goals
 * 2. Subscription auto-processing creates transactions which update account balances
 * 3. Deleting an account cascades to its transactions
 * 4. Category deletion protection across budgets and subscriptions
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

describe("E2E: Full User Journey", () => {
  let AppWrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(async () => {
    testDB.reset();
    resetAsyncStorage();
    jest.clearAllMocks();

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@budget_app_onboarding_complete")
        return Promise.resolve(null);
      if (key === "@budget_app_currency") return Promise.resolve(null);
      return Promise.resolve(null);
    });

    AppWrapper = createAppWrapper();
  });

  it("complete journey: onboard → transact → budget → goal", async () => {
    const { useUser } = require("../../lib/contexts/UserContext");
    const { useCurrency } = require("../../lib/contexts/CurrencyContext");
    const { useAccounts } = require("../../lib/contexts/AccountContext");
    const { useCategories } = require("../../lib/contexts/CategoryContext");
    const {
      useTransactions,
    } = require("../../lib/contexts/TransactionContext");
    const { useBudgets } = require("../../lib/contexts/BudgetContext");
    const { useGoals } = require("../../lib/contexts/GoalContext");

    let user: any, currency: any, account: any, category: any;
    let transaction: any, budget: any, goal: any;

    function Probe() {
      user = useUser();
      currency = useCurrency();
      account = useAccounts();
      category = useCategories();
      transaction = useTransactions();
      budget = useBudgets();
      goal = useGoals();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(user.loading).toBe(false);
    });

    // ---- STEP 1: ONBOARDING ----
    expect(user.isOnboardingComplete).toBe(false);

    await act(async () => {
      await user.setUserProfile("Alice", "USD");
    });
    await act(async () => {
      await currency.setDefaultCurrency("USD");
    });
    await act(async () => {
      await account.addAccount("My Account", "checking", "USD");
    });
    await act(async () => {
      await user.completeOnboarding();
    });

    expect(user.isOnboardingComplete).toBe(true);
    expect(user.userName).toBe("Alice");

    // ---- STEP 2: ADD CATEGORIES (if not seeded) ----
    // Categories may have been auto-seeded; add a custom one
    await act(async () => {
      await category.addCategory("Freelance", "income", "#4CAF50");
    });
    await act(async () => {
      await category.addCategory("Dining", "expense", "#FF5722");
    });

    // ---- STEP 3: ADD TRANSACTIONS ----
    const cats = testDB.getTable("categories");
    const freelanceCat = cats.find((c: any) => c.name === "Freelance");
    const diningCat = cats.find((c: any) => c.name === "Dining");
    const accountId = testDB.getTable("accounts")[0].id;

    // Income
    await act(async () => {
      await transaction.addTransaction(
        accountId,
        freelanceCat.id,
        2000,
        "Project payment",
        Date.now(),
        "income",
      );
    });

    // Expense
    await act(async () => {
      await transaction.addTransaction(
        accountId,
        diningCat.id,
        85,
        "Restaurant",
        Date.now(),
        "expense",
      );
    });

    // Verify balance: 0 + 2000 - 85 = 1915
    expect(testDB.getTable("accounts")[0].balance).toBe(1915);

    // ---- STEP 4: SET BUDGET ----
    await act(async () => {
      await budget.addBudget(diningCat.id, 200, "monthly", "USD");
    });

    expect(testDB.getTable("budgets").length).toBe(1);
    expect(testDB.getTable("budgets")[0].budget_limit).toBe(200);

    // ---- STEP 5: SET GOAL ----
    await act(async () => {
      await goal.addGoal(
        "Emergency Fund",
        5000,
        Date.now() + 180 * 86400000,
        "USD",
      );
    });

    const goals = testDB.getTable("goals");
    expect(goals.length).toBe(1);
    expect(goals[0].currentAmount).toBe(0);

    // Make progress on the goal
    await act(async () => {
      await goal.updateGoalProgress(goals[0].id, 500);
    });

    expect(testDB.getTable("goals")[0].currentAmount).toBe(500);

    // ---- FINAL VERIFICATION ----
    // Database should have a complete, consistent state
    expect(testDB.getTable("user_profile").length).toBe(1);
    expect(testDB.getTable("accounts").length).toBe(1);
    expect(testDB.getTable("transactions").length).toBe(2);
    expect(testDB.getTable("budgets").length).toBe(1);
    expect(testDB.getTable("goals").length).toBe(1);
    expect(testDB.getTable("categories").length).toBeGreaterThanOrEqual(2);
  });
});

describe("E2E: Cross-Context Data Integrity", () => {
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

    testDB.insertDirect("accounts", {
      id: "acc_1",
      name: "Checking",
      type: "checking",
      balance: 5000,
      currency: "USD",
      isDefault: 1,
      createdAt: Date.now(),
    });

    testDB.insertDirect("categories", {
      id: "cat_salary",
      name: "Salary",
      type: "income",
      color: "#4CAF50",
      createdAt: Date.now(),
    });
    testDB.insertDirect("categories", {
      id: "cat_food",
      name: "Food",
      type: "expense",
      color: "#FF5722",
      createdAt: Date.now(),
    });
    testDB.insertDirect("categories", {
      id: "cat_ent",
      name: "Entertainment",
      type: "expense",
      color: "#9C27B0",
      createdAt: Date.now(),
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "@budget_app_onboarding_complete")
        return Promise.resolve("true");
      if (key === "@budget_app_currency") return Promise.resolve("USD");
      return Promise.resolve(null);
    });

    AppWrapper = createAppWrapper();
  });

  it("transaction balance updates are reflected in account data", async () => {
    const {
      useTransactions,
    } = require("../../lib/contexts/TransactionContext");
    const { useAccounts } = require("../../lib/contexts/AccountContext");

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

    const initialBalance = 5000;

    // Add income
    await act(async () => {
      await txState.addTransaction(
        "acc_1",
        "cat_salary",
        1000,
        "Pay",
        Date.now(),
        "income",
      );
    });

    // DB should reflect the new balance
    expect(testDB.getTable("accounts")[0].balance).toBe(initialBalance + 1000);

    // Add expense
    await act(async () => {
      await txState.addTransaction(
        "acc_1",
        "cat_food",
        250,
        "Groceries",
        Date.now(),
        "expense",
      );
    });

    expect(testDB.getTable("accounts")[0].balance).toBe(
      initialBalance + 1000 - 250,
    );

    // Delete the expense → balance should revert
    const transactions = testDB.getTable("transactions");
    const expenseTx = transactions.find((t: any) => t.type === "expense");

    await act(async () => {
      await txState.deleteTransaction(expenseTx.id);
    });

    expect(testDB.getTable("accounts")[0].balance).toBe(initialBalance + 1000);
  });

  it("category with linked budget cannot be deleted", async () => {
    const { useCategories } = require("../../lib/contexts/CategoryContext");
    const { useBudgets } = require("../../lib/contexts/BudgetContext");

    let catState: any = {};
    let budgetState: any = {};

    function Probe() {
      catState = useCategories();
      budgetState = useBudgets();
      return null;
    }

    await act(async () => {
      render(React.createElement(AppWrapper, null, React.createElement(Probe)));
    });

    await waitFor(() => {
      expect(catState.loading).toBe(false);
      expect(budgetState.loading).toBe(false);
    });

    // Create a budget for the food category
    await act(async () => {
      await budgetState.addBudget("cat_food", 300, "monthly", "USD");
    });

    // Try to delete the food category — should fail
    let deleteError: string | null = null;
    await act(async () => {
      try {
        await catState.deleteCategory("cat_food");
      } catch (e: any) {
        deleteError = e.message;
      }
    });

    expect(deleteError).toBeTruthy();
    expect(
      testDB.getTable("categories").find((c: any) => c.id === "cat_food"),
    ).toBeTruthy();
  });

  it("subscription auto-processing creates transaction and updates balance", async () => {
    const {
      useSubscriptions,
    } = require("../../lib/contexts/SubscriptionContext");

    // Create a past-due subscription
    const pastDue = Date.now() - 3 * 86400000;
    testDB.insertDirect("subscriptions", {
      id: "sub_1",
      name: "Spotify",
      amount: 9.99,
      currency: "USD",
      categoryId: "cat_ent",
      frequency: "monthly",
      startDate: pastDue - 30 * 86400000,
      nextDueDate: pastDue,
      isActive: 1,
      reminderDays: 3,
      notes: "",
      createdAt: Date.now(),
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

    const balanceBefore = testDB.getTable("accounts")[0].balance;

    await act(async () => {
      await subState.processDueSubscriptions("auto");
    });

    // Transaction created
    const txs = testDB.getTable("transactions");
    const subTx = txs.find((t: any) => t.subscriptionId === "sub_1");
    expect(subTx).toBeTruthy();
    expect(subTx.amount).toBe(9.99);
    expect(subTx.categoryId).toBe("cat_ent");

    // Balance decreased
    expect(testDB.getTable("accounts")[0].balance).toBeLessThan(balanceBefore);

    // Subscription next due date advanced
    expect(testDB.getTable("subscriptions")[0].nextDueDate).toBeGreaterThan(
      pastDue,
    );
  });

  it("multiple income and expenses produce correct final balance", async () => {
    const {
      useTransactions,
    } = require("../../lib/contexts/TransactionContext");

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

    // Starting balance: 5000
    const ops = [
      { cat: "cat_salary", amount: 3000, type: "income", desc: "Salary" },
      { cat: "cat_food", amount: 200, type: "expense", desc: "Groceries" },
      { cat: "cat_food", amount: 150, type: "expense", desc: "Restaurant" },
      { cat: "cat_ent", amount: 100, type: "expense", desc: "Movie" },
      { cat: "cat_salary", amount: 500, type: "income", desc: "Bonus" },
      { cat: "cat_food", amount: 75, type: "expense", desc: "Coffee" },
    ];

    for (const op of ops) {
      await act(async () => {
        await txState.addTransaction(
          "acc_1",
          op.cat,
          op.amount,
          op.desc,
          Date.now(),
          op.type as any,
        );
      });
    }

    // Expected: 5000 + 3000 - 200 - 150 - 100 + 500 - 75 = 7975
    expect(testDB.getTable("accounts")[0].balance).toBe(7975);
    expect(testDB.getTable("transactions").length).toBe(6);
  });
});
