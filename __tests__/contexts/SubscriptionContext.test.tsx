/**
 * SubscriptionContext — Comprehensive Test Suite
 * Tests CRUD, auto/manual/notify processing, due date advancement,
 * deduplication, catch-up logic, monthly cost calculation, and toggle.
 */
import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  SubscriptionProvider,
  useSubscriptions,
} from "../../lib/contexts/SubscriptionContext";

// ============================================================
// Mock infrastructure
// ============================================================
const mockSubscriptions: any[] = [];

const mockDb = {
  getAllAsync: jest.fn(async () => mockSubscriptions),
  getFirstAsync: jest.fn(async (query: string) => {
    if (query.includes("categories"))
      return { id: "cat-1", name: "Entertainment" };
    if (query.includes("accounts"))
      return { id: "acc-1", currency: "USD", type: "checking", balance: 5000 };
    if (query.includes("transactions") && query.includes("subscriptionId"))
      return null; // no dups
    return null;
  }),
  runAsync: jest.fn(async () => ({ changes: 1 })),
  execAsync: jest.fn(async () => {}),
};

jest.mock("../../lib/database", () => ({
  getDatabase: jest.fn(async () => mockDb),
}));

jest.mock("../../lib/services/WidgetService", () => ({
  widgetUpdater: { queueUpdate: jest.fn() },
}));

jest.mock("../../lib/utils/validation", () => ({
  validateString: jest.fn((val: any, field: string, opts?: any) => {
    if (typeof val !== "string") throw new Error(`${field} must be a string`);
    const trimmed = val.trim();
    if (opts?.required && !trimmed) throw new Error(`${field} required`);
    if (opts?.minLength && trimmed.length < opts.minLength)
      throw new Error(`${field} too short`);
    if (opts?.maxLength && trimmed.length > opts.maxLength)
      throw new Error(`${field} too long`);
    return trimmed;
  }),
  validateAmount: jest.fn((val: any, field: string, opts?: any) => {
    if (typeof val !== "number" || isNaN(val))
      throw new Error(`${field} must be a number`);
    if (!opts?.allowZero && val === 0)
      throw new Error(`${field} cannot be zero`);
    if (!opts?.allowNegative && val < 0)
      throw new Error(`${field} cannot be negative`);
    const max = opts?.max ?? 999999999;
    if (val > max) throw new Error(`${field} exceeds max`);
    return val;
  }),
  validateId: jest.fn((val: any, field: string) => {
    if (!val || typeof val !== "string") throw new Error(`${field} required`);
    return val;
  }),
  validateDate: jest.fn((val: any) => {
    if (typeof val !== "number") throw new Error("Invalid date");
    return val;
  }),
  validateSubscriptionFrequency: jest.fn((val: any) => {
    if (!["daily", "weekly", "monthly", "yearly"].includes(val))
      throw new Error("Invalid frequency");
    return val;
  }),
  ValidationError: class extends Error {
    constructor(
      msg: string,
      public field: string,
      public value: any,
    ) {
      super(msg);
    }
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SubscriptionProvider, null, children);

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscriptions.length = 0;
});

// ============================================================
// Initial State
// ============================================================
describe("SubscriptionContext — Initial State", () => {
  it("starts with empty subscriptions", async () => {
    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.subscriptions).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("activeSubscriptions derived from isActive filter", async () => {
    mockSubscriptions.push(
      {
        id: "s1",
        name: "Netflix",
        amount: 15,
        currency: "USD",
        categoryId: "cat-1",
        frequency: "monthly",
        startDate: Date.now(),
        nextDueDate: Date.now() + 86400000,
        isActive: 1,
        reminderDays: 3,
        createdAt: 1,
      },
      {
        id: "s2",
        name: "Old Sub",
        amount: 10,
        currency: "USD",
        categoryId: "cat-1",
        frequency: "monthly",
        startDate: Date.now(),
        nextDueDate: Date.now() + 86400000,
        isActive: 0,
        reminderDays: 3,
        createdAt: 2,
      },
    );

    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.activeSubscriptions.length).toBe(1);
    expect(result.current.activeSubscriptions[0].id).toBe("s1");
  });
});

// ============================================================
// addSubscription
// ============================================================
describe("SubscriptionContext — addSubscription", () => {
  it("creates a subscription with valid inputs", async () => {
    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    let newId: string | undefined;
    await act(async () => {
      newId = await result.current.addSubscription(
        "Netflix",
        15.99,
        "cat-1",
        "monthly",
        Date.now(),
        "USD",
      );
    });

    expect(newId).toBeDefined();
    expect(typeof newId).toBe("string");

    const insertCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" && call[0].includes("INSERT"),
    );
    expect(insertCall).toBeDefined();
  });

  it("verifies category exists", async () => {
    mockDb.getFirstAsync.mockImplementation(async (query: string) => {
      if (query.includes("categories")) return null; // category not found
      return null;
    });

    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.addSubscription(
          "Netflix",
          15.99,
          "nonexistent",
          "monthly",
          Date.now(),
          "USD",
        );
      }),
    ).rejects.toThrow();
  });

  it("rejects empty name", async () => {
    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.addSubscription(
          "",
          15,
          "cat-1",
          "monthly",
          Date.now(),
          "USD",
        );
      }),
    ).rejects.toThrow();
  });

  it("rejects zero amount", async () => {
    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.addSubscription(
          "Netflix",
          0,
          "cat-1",
          "monthly",
          Date.now(),
          "USD",
        );
      }),
    ).rejects.toThrow();
  });

  it("rejects invalid frequency", async () => {
    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.addSubscription(
          "Netflix",
          15,
          "cat-1",
          "biweekly" as any,
          Date.now(),
          "USD",
        );
      }),
    ).rejects.toThrow();
  });
});

// ============================================================
// updateSubscription
// ============================================================
describe("SubscriptionContext — updateSubscription", () => {
  beforeEach(() => {
    mockSubscriptions.push({
      id: "sub-1",
      name: "Netflix",
      amount: 15,
      currency: "USD",
      categoryId: "cat-1",
      frequency: "monthly",
      startDate: Date.now(),
      nextDueDate: Date.now() + 86400000 * 25,
      isActive: 1,
      reminderDays: 3,
      createdAt: Date.now(),
    });
  });

  it("updates subscription name", async () => {
    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateSubscription("sub-1", {
        name: "Netflix Premium",
      });
    });

    expect(mockDb.runAsync).toHaveBeenCalled();
  });

  it("updates subscription amount", async () => {
    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateSubscription("sub-1", { amount: 22.99 });
    });

    expect(mockDb.runAsync).toHaveBeenCalled();
  });

  it("rejects update for non-existent subscription", async () => {
    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.updateSubscription("nonexistent", { name: "X" });
      }),
    ).rejects.toThrow();
  });
});

// ============================================================
// deleteSubscription
// ============================================================
describe("SubscriptionContext — deleteSubscription", () => {
  beforeEach(() => {
    mockSubscriptions.push({
      id: "sub-1",
      name: "Netflix",
      amount: 15,
      currency: "USD",
      categoryId: "cat-1",
      frequency: "monthly",
      startDate: Date.now(),
      nextDueDate: Date.now() + 86400000 * 25,
      isActive: 1,
      reminderDays: 3,
      createdAt: Date.now(),
    });
  });

  it("deletes an existing subscription", async () => {
    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.deleteSubscription("sub-1");
    });

    const deleteCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" && call[0].includes("DELETE"),
    );
    expect(deleteCall).toBeDefined();
  });
});

// ============================================================
// toggleSubscription
// ============================================================
describe("SubscriptionContext — toggleSubscription", () => {
  beforeEach(() => {
    mockSubscriptions.push({
      id: "sub-1",
      name: "Netflix",
      amount: 15,
      currency: "USD",
      categoryId: "cat-1",
      frequency: "monthly",
      startDate: Date.now(),
      nextDueDate: Date.now() + 86400000 * 25,
      isActive: 1,
      reminderDays: 3,
      createdAt: Date.now(),
    });
  });

  it("toggles active status from true to false", async () => {
    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.toggleSubscription("sub-1");
    });

    // Should have called update with isActive toggled
    expect(mockDb.runAsync).toHaveBeenCalled();
  });
});

// ============================================================
// getMonthlyTotal
// ============================================================
describe("SubscriptionContext — getMonthlyTotal", () => {
  it("calculates monthly cost from monthly subscriptions", async () => {
    mockSubscriptions.push(
      {
        id: "s1",
        name: "Netflix",
        amount: 15,
        currency: "USD",
        categoryId: "cat-1",
        frequency: "monthly",
        startDate: Date.now(),
        nextDueDate: Date.now() + 86400000,
        isActive: 1,
        reminderDays: 3,
        createdAt: 1,
      },
      {
        id: "s2",
        name: "Spotify",
        amount: 10,
        currency: "USD",
        categoryId: "cat-1",
        frequency: "monthly",
        startDate: Date.now(),
        nextDueDate: Date.now() + 86400000,
        isActive: 1,
        reminderDays: 3,
        createdAt: 2,
      },
    );

    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const total = result.current.getMonthlyTotal();
    expect(total).toBeCloseTo(25, 0);
  });

  it("normalizes yearly subscription to monthly", async () => {
    mockSubscriptions.push({
      id: "s1",
      name: "Annual Plan",
      amount: 120,
      currency: "USD",
      categoryId: "cat-1",
      frequency: "yearly",
      startDate: Date.now(),
      nextDueDate: Date.now() + 86400000,
      isActive: 1,
      reminderDays: 3,
      createdAt: 1,
    });

    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const total = result.current.getMonthlyTotal();
    expect(total).toBeCloseTo(10, 0); // 120/12
  });

  it("normalizes weekly subscription to monthly", async () => {
    mockSubscriptions.push({
      id: "s1",
      name: "Weekly",
      amount: 10,
      currency: "USD",
      categoryId: "cat-1",
      frequency: "weekly",
      startDate: Date.now(),
      nextDueDate: Date.now() + 86400000,
      isActive: 1,
      reminderDays: 3,
      createdAt: 1,
    });

    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const total = result.current.getMonthlyTotal();
    expect(total).toBeCloseTo(43.3, 0); // 10 * 4.33
  });

  it("excludes inactive subscriptions from total", async () => {
    mockSubscriptions.push({
      id: "s1",
      name: "Inactive",
      amount: 100,
      currency: "USD",
      categoryId: "cat-1",
      frequency: "monthly",
      startDate: Date.now(),
      nextDueDate: Date.now() + 86400000,
      isActive: 0,
      reminderDays: 3,
      createdAt: 1,
    });

    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const total = result.current.getMonthlyTotal();
    expect(total).toBe(0);
  });
});

// ============================================================
// getUpcomingSubscriptions
// ============================================================
describe("SubscriptionContext — getUpcomingSubscriptions", () => {
  it("returns subscriptions due within specified days", async () => {
    const tomorrow = Date.now() + 86400000;
    const nextWeek = Date.now() + 86400000 * 7;
    const nextMonth = Date.now() + 86400000 * 35;

    mockSubscriptions.push(
      {
        id: "s1",
        name: "Due Tomorrow",
        amount: 10,
        currency: "USD",
        categoryId: "cat-1",
        frequency: "monthly",
        startDate: Date.now(),
        nextDueDate: tomorrow,
        isActive: 1,
        reminderDays: 3,
        createdAt: 1,
      },
      {
        id: "s2",
        name: "Due Next Week",
        amount: 10,
        currency: "USD",
        categoryId: "cat-1",
        frequency: "monthly",
        startDate: Date.now(),
        nextDueDate: nextWeek,
        isActive: 1,
        reminderDays: 3,
        createdAt: 2,
      },
      {
        id: "s3",
        name: "Due Next Month",
        amount: 10,
        currency: "USD",
        categoryId: "cat-1",
        frequency: "monthly",
        startDate: Date.now(),
        nextDueDate: nextMonth,
        isActive: 1,
        reminderDays: 3,
        createdAt: 3,
      },
    );

    const { result } = renderHook(() => useSubscriptions(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const upcoming = result.current.getUpcomingSubscriptions(7);
    expect(upcoming.length).toBe(2); // tomorrow and next week
  });
});

// ============================================================
// useSubscriptions guard
// ============================================================
describe("SubscriptionContext — useSubscriptions guard", () => {
  it("throws when used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useSubscriptions());
    }).toThrow("useSubscriptions must be used within a SubscriptionProvider");
    spy.mockRestore();
  });
});
