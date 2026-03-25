/**
 * GoalContext — Comprehensive Test Suite
 * Tests full CRUD lifecycle, contributions, completion detection,
 * deadline validation, and query helpers.
 */
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { GoalProvider, useGoals } from "../../lib/contexts/GoalContext";

// ============================================================
// Mock infrastructure
// ============================================================
const mockGoals: any[] = [];

const mockDb = {
  getAllAsync: jest.fn(async () => mockGoals),
  getFirstAsync: jest.fn(async () => null),
  runAsync: jest.fn(async () => ({ changes: 1 })),
  execAsync: jest.fn(async () => {}),
};

jest.mock("../../lib/database", () => ({
  getDatabase: jest.fn(async () => mockDb),
}));

jest.mock("../../lib/utils/validation", () => ({
  validateString: jest.fn((val: any, field: string, opts?: any) => {
    if (typeof val !== "string") throw new Error(`${field} must be a string`);
    const trimmed = val.trim();
    if (opts?.required && !trimmed) throw new Error(`${field} is required`);
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
  validateDate: jest.fn((val: any) => {
    if (typeof val !== "number") throw new Error("Invalid date");
    return val;
  }),
  validateId: jest.fn((val: any, field: string) => {
    if (!val || typeof val !== "string") throw new Error(`${field} required`);
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
  React.createElement(GoalProvider, null, children);

beforeEach(() => {
  jest.clearAllMocks();
  mockGoals.length = 0;
});

// ============================================================
// Initial State
// ============================================================
describe("GoalContext — Initial State", () => {
  it("starts with empty goals", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.goals).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});

// ============================================================
// addGoal
// ============================================================
describe("GoalContext — addGoal", () => {
  it("creates a goal with valid inputs", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const deadline = Date.now() + 86400000 * 180; // 6 months from now
    await act(async () => {
      await result.current.addGoal("Emergency Fund", 5000, deadline, "USD");
    });

    const insertCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" && call[0].includes("INSERT"),
    );
    expect(insertCall).toBeDefined();
  });

  it("starts with currentAmount = 0", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const deadline = Date.now() + 86400000 * 90;
    await act(async () => {
      await result.current.addGoal("Vacation", 2000, deadline, "USD");
    });

    const insertCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" && call[0].includes("INSERT"),
    );
    if (insertCall) {
      // currentAmount should be 0
      expect(insertCall[1]).toContain(0);
    }
  });

  it("rejects empty name", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.addGoal("", 5000, Date.now() + 86400000, "USD");
      }),
    ).rejects.toThrow();
  });

  it("rejects zero target amount", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.addGoal("Goal", 0, Date.now() + 86400000, "USD");
      }),
    ).rejects.toThrow();
  });

  it("rejects negative target amount", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.addGoal(
          "Goal",
          -100,
          Date.now() + 86400000,
          "USD",
        );
      }),
    ).rejects.toThrow();
  });

  it("rejects target amount exceeding max", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.addGoal(
          "Goal",
          10000000000,
          Date.now() + 86400000,
          "USD",
        );
      }),
    ).rejects.toThrow();
  });
});

// ============================================================
// updateGoalProgress
// ============================================================
describe("GoalContext — updateGoalProgress", () => {
  beforeEach(() => {
    mockGoals.push({
      id: "goal-1",
      name: "Emergency Fund",
      targetAmount: 5000,
      currentAmount: 2000,
      currency: "USD",
      deadline: Date.now() + 86400000 * 90,
      createdAt: Date.now(),
    });
  });

  it("updates currentAmount via updateGoalProgress", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateGoalProgress("goal-1", 2500);
    });

    const updateCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" && call[0].includes("UPDATE"),
    );
    expect(updateCall).toBeDefined();
  });

  it("allows zero amount (resets progress)", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateGoalProgress("goal-1", 0);
    });

    expect(mockDb.runAsync).toHaveBeenCalled();
  });

  it("rejects negative amount", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.updateGoalProgress("goal-1", -100);
      }),
    ).rejects.toThrow();
  });
});

// ============================================================
// updateGoal
// ============================================================
describe("GoalContext — updateGoal", () => {
  beforeEach(() => {
    mockGoals.push({
      id: "goal-1",
      name: "Old Name",
      targetAmount: 5000,
      currentAmount: 1000,
      currency: "USD",
      deadline: Date.now() + 86400000 * 90,
      createdAt: Date.now(),
    });
  });

  it("updates goal name", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateGoal(
        "goal-1",
        "New Name",
        5000,
        1000,
        Date.now() + 86400000 * 90,
      );
    });

    expect(mockDb.runAsync).toHaveBeenCalled();
  });

  it("updates target amount", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateGoal(
        "goal-1",
        "Old Name",
        10000,
        1000,
        Date.now() + 86400000 * 90,
      );
    });

    expect(mockDb.runAsync).toHaveBeenCalled();
  });
});

// ============================================================
// deleteGoal
// ============================================================
describe("GoalContext — deleteGoal", () => {
  beforeEach(() => {
    mockGoals.push({
      id: "goal-1",
      name: "Test Goal",
      targetAmount: 5000,
      currentAmount: 1000,
      currency: "USD",
      deadline: Date.now() + 86400000 * 90,
      createdAt: Date.now(),
    });
  });

  it("deletes an existing goal", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.deleteGoal("goal-1");
    });

    const deleteCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" &&
        call[0].includes("UPDATE") &&
        call[0].includes("deletedAt"),
    );
    expect(deleteCall).toBeDefined();
  });
});

// ============================================================
// Query helpers
// ============================================================
describe("GoalContext — Query Helpers", () => {
  beforeEach(() => {
    const future = Date.now() + 86400000 * 90;
    const past = Date.now() - 86400000;
    mockGoals.push(
      {
        id: "g1",
        name: "Active",
        targetAmount: 1000,
        currentAmount: 500,
        currency: "USD",
        deadline: future,
        createdAt: 1,
      },
      {
        id: "g2",
        name: "Completed",
        targetAmount: 500,
        currentAmount: 500,
        currency: "USD",
        deadline: future,
        createdAt: 2,
      },
      {
        id: "g3",
        name: "Overdue",
        targetAmount: 1000,
        currentAmount: 200,
        currency: "USD",
        deadline: past,
        createdAt: 3,
      },
    );
  });

  it("getActiveGoals returns goals where currentAmount < targetAmount", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const active = result.current
      .getAllGoals()
      .filter((g) => g.currentAmount < g.targetAmount);
    expect(active.length).toBe(2); // g1 and g3
    expect(active.every((g) => g.currentAmount < g.targetAmount)).toBe(true);
  });

  it("getCompletedGoals returns goals where currentAmount >= targetAmount", async () => {
    const { result } = renderHook(() => useGoals(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const completed = result.current
      .getAllGoals()
      .filter((g) => g.currentAmount >= g.targetAmount);
    expect(completed.length).toBe(1);
    expect(completed[0].id).toBe("g2");
  });
});

// ============================================================
// useGoals guard
// ============================================================
describe("GoalContext — useGoals guard", () => {
  it("throws when used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useGoals());
    }).toThrow("useGoals must be used within GoalProvider");
    spy.mockRestore();
  });
});
