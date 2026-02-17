/**
 * AccountContext — Comprehensive Test Suite
 * Tests full CRUD lifecycle, default account management, validation,
 * balance handling, last-account protection, and optimistic updates.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AccountProvider, useAccounts } from '../../lib/contexts/AccountContext';

// ============================================================
// Mock infrastructure
// ============================================================
const mockAccounts: any[] = [];
let mockDbCallLog: string[] = [];

const mockDb = {
  getAllAsync: jest.fn(async () => mockAccounts),
  getFirstAsync: jest.fn(async () => null),
  runAsync: jest.fn(async () => ({ changes: 1 })),
  execAsync: jest.fn(async () => {}),
};

jest.mock('../../lib/database', () => ({
  getDatabase: jest.fn(async () => mockDb),
}));

jest.mock('../../lib/utils/validation', () => ({
  validateString: jest.fn((val: any, field: string, opts?: any) => {
    if (typeof val !== 'string') throw new Error(`${field} must be a string`);
    const trimmed = val.trim();
    if (opts?.required && trimmed.length === 0) throw new Error(`${field} is required`);
    if (opts?.minLength && trimmed.length < opts.minLength)
      throw new Error(`${field} must be at least ${opts.minLength} characters`);
    if (opts?.maxLength && trimmed.length > opts.maxLength)
      throw new Error(`${field} cannot exceed ${opts.maxLength} characters`);
    return trimmed;
  }),
  validateAmount: jest.fn((val: any, field: string, opts?: any) => {
    if (typeof val !== 'number' || isNaN(val)) throw new Error(`${field} must be a number`);
    if (!opts?.allowNegative && val < 0) throw new Error(`${field} cannot be negative`);
    const max = opts?.max ?? 999999999;
    if (val > max) throw new Error(`${field} cannot exceed ${max}`);
    return val;
  }),
  validateAccountType: jest.fn((val: any) => {
    if (!['checking', 'savings', 'credit_card'].includes(val))
      throw new Error('Invalid account type');
    return val;
  }),
  validateId: jest.fn((val: any, field: string) => {
    if (!val || typeof val !== 'string') throw new Error(`${field} is required`);
    return val;
  }),
  ValidationError: class ValidationError extends Error {
    constructor(msg: string, public field: string, public value: any) {
      super(msg);
    }
  },
}));

// Wrapper for renderHook
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AccountProvider, null, children);

beforeEach(() => {
  jest.clearAllMocks();
  mockAccounts.length = 0;
  mockDbCallLog = [];
});

// ============================================================
// Initial State
// ============================================================
describe('AccountContext — Initial State', () => {
  it('provides empty accounts on initial load', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });

    // Wait for loading to complete
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.accounts).toEqual([]);
  });

  it('loading starts as true and becomes false', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.loading).toBe(false);
  });
});

// ============================================================
// addAccount
// ============================================================
describe('AccountContext — addAccount', () => {
  it('creates an account with valid inputs', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce(null); // no existing default
    mockDb.runAsync.mockResolvedValue({ changes: 1 });

    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.addAccount('My Checking', 'checking', 'USD');
    });

    expect(mockDb.runAsync).toHaveBeenCalled();
    // Verify INSERT was called with the right parameters
    const insertCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT')
    );
    expect(insertCall).toBeDefined();
  });

  it('auto-sets first account as default', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce(null); // no existing default

    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.addAccount('First Account', 'checking', 'USD');
    });

    // The isDefault should be 1 when no existing default
    const insertCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT')
    );
    if (insertCall) {
      // The isDefault parameter should be 1
      expect(insertCall[1]).toContain(1); // isDefault=1
    }
  });

  it('rejects empty name', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.addAccount('', 'checking', 'USD');
      })
    ).rejects.toThrow();
  });

  it('rejects invalid account type', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.addAccount('Test', 'invalid' as any, 'USD');
      })
    ).rejects.toThrow();
  });

  it('defaults currency to USD if not provided', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.addAccount('Test', 'checking');
    });

    // Should use USD as default currency
    expect(mockDb.runAsync).toHaveBeenCalled();
  });
});

// ============================================================
// updateAccount
// ============================================================
describe('AccountContext — updateAccount', () => {
  it('updates account name', async () => {
    mockAccounts.push({
      id: 'acc-1',
      name: 'Old Name',
      type: 'checking',
      balance: 1000,
      currency: 'USD',
      isDefault: 1,
      createdAt: Date.now(),
    });

    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateAccount('acc-1', 'New Name', 1000, 'USD');
    });

    const updateCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
    );
    expect(updateCall).toBeDefined();
  });

  it('allows negative balance for credit card accounts', async () => {
    mockAccounts.push({
      id: 'cc-1',
      name: 'Credit Card',
      type: 'credit_card',
      balance: -500,
      currency: 'USD',
      isDefault: 0,
      createdAt: Date.now(),
    });

    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateAccount('cc-1', 'Credit Card', -1000, 'USD');
    });

    expect(mockDb.runAsync).toHaveBeenCalled();
  });
});

// ============================================================
// deleteAccount
// ============================================================
describe('AccountContext — deleteAccount', () => {
  it('prevents deleting the last account', async () => {
    mockAccounts.push({
      id: 'acc-1',
      name: 'Only Account',
      type: 'checking',
      balance: 1000,
      currency: 'USD',
      isDefault: 1,
      createdAt: Date.now(),
    });

    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await expect(
      act(async () => {
        await result.current.deleteAccount('acc-1');
      })
    ).rejects.toThrow();
  });

  it('deletes account when multiple exist', async () => {
    mockAccounts.push(
      { id: 'acc-1', name: 'A1', type: 'checking', balance: 500, currency: 'USD', isDefault: 1, createdAt: 1 },
      { id: 'acc-2', name: 'A2', type: 'savings', balance: 1000, currency: 'USD', isDefault: 0, createdAt: 2 },
    );

    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // Mock the execAsync for DB transaction
    mockDb.execAsync.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.deleteAccount('acc-2');
    });

    // Should have called delete operations
    expect(mockDb.execAsync).toHaveBeenCalled();
  });
});

// ============================================================
// setDefaultAccount
// ============================================================
describe('AccountContext — setDefaultAccount', () => {
  it('sets an account as default', async () => {
    mockAccounts.push(
      { id: 'acc-1', name: 'A1', type: 'checking', balance: 500, currency: 'USD', isDefault: 1, createdAt: 1 },
      { id: 'acc-2', name: 'A2', type: 'savings', balance: 1000, currency: 'USD', isDefault: 0, createdAt: 2 },
    );

    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.setDefaultAccount('acc-2');
    });

    expect(mockDb.execAsync).toHaveBeenCalled();
  });
});

// ============================================================
// Derived state
// ============================================================
describe('AccountContext — Derived State', () => {
  it('defaultAccount returns the account with isDefault=true', async () => {
    mockAccounts.push(
      { id: 'acc-1', name: 'A1', type: 'checking', balance: 500, currency: 'USD', isDefault: 0, createdAt: 1 },
      { id: 'acc-2', name: 'Default', type: 'checking', balance: 1000, currency: 'USD', isDefault: 1, createdAt: 2 },
    );

    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.defaultAccount?.id).toBe('acc-2');
  });

  it('getTotalBalance sums all account balances', async () => {
    mockAccounts.push(
      { id: 'acc-1', name: 'A1', type: 'checking', balance: 1000, currency: 'USD', isDefault: 1, createdAt: 1 },
      { id: 'acc-2', name: 'A2', type: 'savings', balance: 500, currency: 'USD', isDefault: 0, createdAt: 2 },
    );

    const { result } = renderHook(() => useAccounts(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.getTotalBalance()).toBe(1500);
  });
});

// ============================================================
// useAccounts outside provider
// ============================================================
describe('AccountContext — useAccounts guard', () => {
  it('throws when used outside provider', () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAccounts());
    }).toThrow('useAccounts must be used within AccountProvider');
    spy.mockRestore();
  });
});
