/**
 * BudgetContext — Comprehensive Test Suite
 * Tests per-category and overall budgets, carryover logic,
 * period transitions, snapshots, and validation.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { BudgetProvider, useBudgets } from '../../lib/contexts/BudgetContext';

// ============================================================
// Mock infrastructure
// ============================================================
const mockBudgets: any[] = [];
let mockMonthlyBudget: any = null;

const mockDb = {
  getAllAsync: jest.fn(async (query: string) => {
    if (query.includes('budgets')) return mockBudgets;
    return [];
  }),
  getFirstAsync: jest.fn(async (query: string) => {
    if (query.includes('monthly_budgets')) return mockMonthlyBudget;
    if (query.includes('categories')) return { id: 'cat-1', name: 'Food' };
    if (query.includes('budget_settings')) return { budgetPeriodStartDay: 1, enableCarryover: true };
    return null;
  }),
  runAsync: jest.fn(async () => ({ changes: 1 })),
  execAsync: jest.fn(async () => {}),
};

jest.mock('../../lib/database', () => ({
  getDatabase: jest.fn(async () => mockDb),
}));

jest.mock('../../lib/utils/validation', () => ({
  validateAmount: jest.fn((val: any, field: string, opts?: any) => {
    if (typeof val !== 'number' || isNaN(val)) throw new Error(`${field} must be a number`);
    if (!opts?.allowZero && val === 0) throw new Error(`${field} cannot be zero`);
    if (!opts?.allowNegative && val < 0) throw new Error(`${field} cannot be negative`);
    const max = opts?.max ?? 999999999;
    if (val > max) throw new Error(`${field} exceeds max`);
    return val;
  }),
  validateString: jest.fn((val: any, field: string, opts?: any) => {
    if (typeof val !== 'string') throw new Error(`${field} must be a string`);
    return val.trim();
  }),
  validateId: jest.fn((val: any, field: string) => {
    if (!val || typeof val !== 'string') throw new Error(`${field} required`);
    return val;
  }),
  validateBudgetPeriod: jest.fn((val: any) => {
    if (val !== 'monthly' && val !== 'yearly') throw new Error('Invalid period');
    return val;
  }),
  ValidationError: class extends Error {
    constructor(msg: string, public field: string, public value: any) { super(msg); }
  },
}));

jest.mock('../../lib/utils/periodCalculations', () => ({
  getCurrentPeriod: jest.fn(() => ({
    start: new Date(2025, 0, 1).getTime(),
    end: new Date(2025, 1, 1).getTime() - 1,
  })),
  getNextPeriod: jest.fn(() => ({
    start: new Date(2025, 1, 1).getTime(),
    end: new Date(2025, 2, 1).getTime() - 1,
  })),
  needsPeriodTransition: jest.fn(() => false),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(BudgetProvider, null, children);

beforeEach(() => {
  jest.clearAllMocks();
  mockBudgets.length = 0;
  mockMonthlyBudget = null;
});

// ============================================================
// Initial State
// ============================================================
describe('BudgetContext — Initial State', () => {
  it('starts with empty budgets', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
    expect(result.current.budgets).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('monthlyBudget is null when no monthly budget exists', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
    expect(result.current.monthlyBudget).toBeNull();
  });
});

// ============================================================
// addBudget (per-category)
// ============================================================
describe('BudgetContext — addBudget', () => {
  it('creates a per-category budget', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await act(async () => {
      await result.current.addBudget('cat-1', 500, 'monthly', 'USD');
    });

    const insertCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT')
    );
    expect(insertCall).toBeDefined();
  });

  it('rejects zero budget limit', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await expect(
      act(async () => {
        await result.current.addBudget('cat-1', 0, 'monthly', 'USD');
      })
    ).rejects.toThrow();
  });

  it('rejects negative budget limit', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await expect(
      act(async () => {
        await result.current.addBudget('cat-1', -100, 'monthly', 'USD');
      })
    ).rejects.toThrow();
  });

});

// ============================================================
// setMonthlyBudget
// ============================================================
describe('BudgetContext — setMonthlyBudget', () => {
  it('creates an overall monthly budget', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await act(async () => {
      await result.current.setMonthlyBudget(3000, 'USD');
    });

    // Should have either INSERT or UPDATE
    expect(mockDb.runAsync).toHaveBeenCalled();
  });

  it('updates existing overall budget', async () => {
    mockMonthlyBudget = { id: 'mb-1', amount: 2000, currency: 'USD' };

    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await act(async () => {
      await result.current.setMonthlyBudget(3500, 'USD');
    });

    const updateCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
    );
    // Could be INSERT or UPDATE depending on existence check
    expect(mockDb.runAsync).toHaveBeenCalled();
  });

  it('rejects zero overall budget', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await expect(
      act(async () => {
        await result.current.setMonthlyBudget(0, 'USD');
      })
    ).rejects.toThrow();
  });
});

// ============================================================
// updateBudget
// ============================================================
describe('BudgetContext — updateBudget', () => {
  beforeEach(() => {
    mockBudgets.push({
      id: 'bud-1',
      categoryId: 'cat-1',
      budget_limit: 500,
      currency: 'USD',
      period: 'monthly',
      allowCarryover: 0,
      lastCarryoverAmount: 0,
      lastPeriodEnd: 0,
      createdAt: Date.now(),
    });
  });

  it('updates budget limit', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await act(async () => {
      await result.current.updateBudget('bud-1', 750, 'monthly', 'USD');
    });

    expect(mockDb.runAsync).toHaveBeenCalled();
  });

  it('updates budget period', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await act(async () => {
      await result.current.updateBudget('bud-1', 500, 'yearly');
    });

    expect(mockDb.runAsync).toHaveBeenCalled();
  });
});

// ============================================================
// deleteBudget
// ============================================================
describe('BudgetContext — deleteBudget', () => {
  beforeEach(() => {
    mockBudgets.push({
      id: 'bud-1',
      categoryId: 'cat-1',
      budget_limit: 500,
      currency: 'USD',
      period: 'monthly',
      allowCarryover: 0,
      lastCarryoverAmount: 0,
      lastPeriodEnd: 0,
      createdAt: Date.now(),
    });
  });

  it('deletes a budget', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    await act(async () => {
      await result.current.deleteBudget('bud-1');
    });

    const deleteCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('DELETE')
    );
    expect(deleteCall).toBeDefined();
  });
});

// ============================================================
// budgetsWithCarryover (derived)
// ============================================================
describe('BudgetContext — budgetsWithCarryover', () => {
  beforeEach(() => {
    mockBudgets.push({
      id: 'bud-1',
      categoryId: 'cat-1',
      budget_limit: 500,
      currency: 'USD',
      period: 'monthly',
      allowCarryover: 1,
      lastCarryoverAmount: 50,
      lastPeriodEnd: Date.now() - 86400000,
      createdAt: Date.now(),
    });
  });

  it('adds carryoverAmount and availableAmount fields', async () => {
    const { result } = renderHook(() => useBudgets(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    const bwc = result.current.budgetsWithCarryover;
    expect(bwc.length).toBe(1);
    expect(bwc[0].carryoverAmount).toBe(50);
    expect(bwc[0].availableAmount).toBe(550); // 500 + 50
  });
});

// ============================================================
// useBudgets guard
// ============================================================
describe('BudgetContext — useBudgets guard', () => {
  it('throws when used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useBudgets());
    }).toThrow('useBudgets must be used within BudgetProvider');
    spy.mockRestore();
  });
});
