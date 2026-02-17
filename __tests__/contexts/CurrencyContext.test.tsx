/**
 * CurrencyContext — Comprehensive Test Suite
 * Tests default currency management, AsyncStorage persistence,
 * validation of invalid currency codes, and helper methods.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { CurrencyProvider, useCurrency } from '../../lib/contexts/CurrencyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage is already mocked in setup.ts

const STORAGE_KEY = '@budget_app_currency';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(CurrencyProvider, null, children);

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

// ============================================================
// Initial State
// ============================================================
describe('CurrencyContext — Initial State', () => {
  it('defaults to USD when nothing stored', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.defaultCurrencyCode).toBe('USD');
    expect(result.current.defaultCurrency).toBeDefined();
    expect(result.current.defaultCurrency.code).toBe('USD');
    expect(result.current.isLoading).toBe(false);
  });

  it('loads saved currency from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('EUR');

    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.defaultCurrencyCode).toBe('EUR');
    expect(result.current.defaultCurrency.code).toBe('EUR');
  });

  it('falls back to USD if stored code is invalid', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('INVALID_CODE');

    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // Invalid code → getCurrency returns undefined → stays default
    expect(result.current.defaultCurrencyCode).toBe('USD');
  });
});

// ============================================================
// setDefaultCurrency
// ============================================================
describe('CurrencyContext — setDefaultCurrency', () => {
  it('updates default currency to a valid code', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.setDefaultCurrency('GBP');
    });

    expect(result.current.defaultCurrencyCode).toBe('GBP');
    expect(result.current.defaultCurrency.code).toBe('GBP');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'GBP');
  });

  it('updates to PKR', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.setDefaultCurrency('PKR');
    });

    expect(result.current.defaultCurrencyCode).toBe('PKR');
  });

  it('silently ignores invalid currency code', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.setDefaultCurrency('FAKE');
    });

    // Currency should remain unchanged
    expect(result.current.defaultCurrencyCode).toBe('USD');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ============================================================
// getCurrencyByCode
// ============================================================
describe('CurrencyContext — getCurrencyByCode', () => {
  it('returns currency for valid code', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    const usd = result.current.getCurrencyByCode('USD');
    expect(usd).toBeDefined();
    expect(usd!.code).toBe('USD');
    expect(usd!.symbol).toBe('$');
  });

  it('returns undefined for invalid code', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    const fake = result.current.getCurrencyByCode('XYZ');
    expect(fake).toBeUndefined();
  });

  it('returns JPY with 0 decimal places', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    const jpy = result.current.getCurrencyByCode('JPY');
    expect(jpy).toBeDefined();
    expect(jpy!.decimalDigits).toBe(0);
  });
});

// ============================================================
// allCurrencies
// ============================================================
describe('CurrencyContext — allCurrencies', () => {
  it('exposes the full CURRENCIES array', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(Array.isArray(result.current.allCurrencies)).toBe(true);
    expect(result.current.allCurrencies.length).toBeGreaterThan(100);
  });

  it('every currency has required fields', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    for (const c of result.current.allCurrencies) {
      expect(c.code).toBeDefined();
      expect(c.symbol).toBeDefined();
      expect(c.name).toBeDefined();
      expect(typeof c.decimalDigits).toBe('number');
    }
  });
});

// ============================================================
// AsyncStorage error handling
// ============================================================
describe('CurrencyContext — Error handling', () => {
  it('falls back to defaults when AsyncStorage load fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.defaultCurrencyCode).toBe('USD');
    expect(result.current.isLoading).toBe(false);
    spy.mockRestore();
  });

  it('silently handles save failure', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write error'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCurrency(), { wrapper });
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.setDefaultCurrency('GBP');
    });

    // State may still be updated, but storage write failed
    spy.mockRestore();
  });
});

// ============================================================
// useCurrency guard
// ============================================================
describe('CurrencyContext — useCurrency guard', () => {
  it('throws when used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useCurrency());
    }).toThrow('useCurrency must be used within a CurrencyProvider');
    spy.mockRestore();
  });
});
