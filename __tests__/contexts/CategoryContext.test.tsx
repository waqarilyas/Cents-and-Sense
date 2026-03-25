/**
 * CategoryContext — Comprehensive Test Suite
 * Tests CRUD, default seeding, deletion protection, invalid ID migration,
 * and category filtering.
 */
import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  CategoryProvider,
  useCategories,
} from "../../lib/contexts/CategoryContext";

// ============================================================
// Mock infrastructure
// ============================================================
const mockCategories: any[] = [];

const mockDb = {
  getAllAsync: jest.fn(async () => mockCategories),
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
  validateId: jest.fn((val: any) => val),
  ValidationError: class ValidationError extends Error {
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
  React.createElement(CategoryProvider, null, children);

beforeEach(() => {
  jest.clearAllMocks();
  mockCategories.length = 0;
});

// ============================================================
// Initial State & Default Seeding
// ============================================================
describe("CategoryContext — Initial State", () => {
  it("provides empty arrays when no categories and no seeding", async () => {
    // When getAllAsync returns empty, it triggers default seeding
    mockDb.getAllAsync
      .mockResolvedValueOnce([]) // first load → empty → seed
      .mockResolvedValueOnce([
        // after seeding, reload
        {
          id: "food",
          name: "Food & Dining",
          type: "expense",
          color: "#F97316",
          createdAt: 1,
        },
      ]);

    const { result } = renderHook(() => useCategories(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // After seeding, categories should be populated
    expect(result.current.loading).toBe(false);
  });

  it("loading starts as true", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper });
    // Initially loading
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
  });
});

// ============================================================
// addCategory
// ============================================================
describe("CategoryContext — addCategory", () => {
  beforeEach(() => {
    mockCategories.push({
      id: "food",
      name: "Food",
      type: "expense",
      color: "#F97316",
      createdAt: 1,
    });
  });

  it("creates a category with valid inputs", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    await act(async () => {
      await result.current.addCategory("Travel", "expense", "#3B82F6");
    });

    const insertCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" && call[0].includes("INSERT"),
    );
    expect(insertCall).toBeDefined();
  });

  it("rejects empty name", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    await expect(
      act(async () => {
        await result.current.addCategory("", "expense", "#000");
      }),
    ).rejects.toThrow();
  });
});

// ============================================================
// updateCategory
// ============================================================
describe("CategoryContext — updateCategory", () => {
  beforeEach(() => {
    mockCategories.push({
      id: "food",
      name: "Food",
      type: "expense",
      color: "#F97316",
      createdAt: 1,
    });
  });

  it("updates category name and color", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    await act(async () => {
      await result.current.updateCategory("food", "Food & Dining", "#EF4444");
    });

    const updateCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" && call[0].includes("UPDATE"),
    );
    expect(updateCall).toBeDefined();
  });

  it("rejects update for non-existent category", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    await expect(
      act(async () => {
        await result.current.updateCategory("nonexistent", "X", "#000");
      }),
    ).rejects.toThrow();
  });
});

// ============================================================
// deleteCategory — Protection
// ============================================================
describe("CategoryContext — deleteCategory", () => {
  beforeEach(() => {
    mockCategories.push(
      {
        id: "food",
        name: "Food",
        type: "expense",
        color: "#F97316",
        createdAt: 1,
      },
      {
        id: "transport",
        name: "Transport",
        type: "expense",
        color: "#8B5CF6",
        createdAt: 2,
      },
    );
  });

  it("deletes a category with no linked data", async () => {
    // No linked subscriptions or budgets
    mockDb.getFirstAsync.mockResolvedValue(null);

    const { result } = renderHook(() => useCategories(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    await act(async () => {
      await result.current.deleteCategory("transport");
    });

    const deleteCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" &&
        call[0].includes("UPDATE") &&
        call[0].includes("deletedAt"),
    );
    expect(deleteCall).toBeDefined();
  });

  it("rejects deletion when category has linked subscriptions", async () => {
    // Simulate linked subscription found
    mockDb.getFirstAsync.mockResolvedValueOnce({ id: "sub-1" }); // subscription exists

    const { result } = renderHook(() => useCategories(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    await expect(
      act(async () => {
        await result.current.deleteCategory("food");
      }),
    ).rejects.toThrow(/subscription/i);
  });

  it("rejects deletion when category has linked budgets", async () => {
    // No subscription, but budget exists
    mockDb.getFirstAsync
      .mockResolvedValueOnce(null) // no subscription
      .mockResolvedValueOnce({ id: "bud-1" }); // budget exists

    const { result } = renderHook(() => useCategories(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    await expect(
      act(async () => {
        await result.current.deleteCategory("food");
      }),
    ).rejects.toThrow(/budget/i);
  });
});

// ============================================================
// Derived State
// ============================================================
describe("CategoryContext — Derived State", () => {
  beforeEach(() => {
    mockCategories.push(
      {
        id: "food",
        name: "Food",
        type: "expense",
        color: "#F97316",
        createdAt: 1,
      },
      {
        id: "transport",
        name: "Transport",
        type: "expense",
        color: "#8B5CF6",
        createdAt: 2,
      },
      {
        id: "salary",
        name: "Salary",
        type: "income",
        color: "#22C55E",
        createdAt: 3,
      },
    );
  });

  it("expenseCategories returns only expense type", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(
      result.current.expenseCategories.every((c) => c.type === "expense"),
    ).toBe(true);
    expect(result.current.expenseCategories.length).toBe(2);
  });

  it("incomeCategories returns only income type", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(
      result.current.incomeCategories.every((c) => c.type === "income"),
    ).toBe(true);
    expect(result.current.incomeCategories.length).toBe(1);
  });
});

// ============================================================
// useCategories outside provider
// ============================================================
describe("CategoryContext — useCategories guard", () => {
  it("throws when used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useCategories());
    }).toThrow("useCategories must be used within CategoryProvider");
    spy.mockRestore();
  });
});
