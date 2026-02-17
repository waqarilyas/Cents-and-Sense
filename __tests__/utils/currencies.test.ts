/**
 * Currency Module — Comprehensive Test Suite
 * Tests currency lookup, formatting, search, regions, and all utility functions.
 */
import {
  getCurrency,
  getCurrencySymbol,
  formatCurrencyAmount,
  getCurrenciesByRegion,
  getPopularCurrencies,
  searchCurrencies,
  getAllRegions,
  CURRENCIES,
  POPULAR_CURRENCY_CODES,
  DEFAULT_CURRENCY_CODE,
  REGION_NAMES,
} from '../../lib/currencies';

// ============================================================
// Currency Lookup
// ============================================================
describe('getCurrency', () => {
  it('returns USD currency object', () => {
    const usd = getCurrency('USD');
    expect(usd).toBeDefined();
    expect(usd!.code).toBe('USD');
    expect(usd!.name).toBe('US Dollar');
    expect(usd!.symbol).toBe('$');
    expect(usd!.decimalDigits).toBe(2);
  });

  it('returns EUR currency object', () => {
    const eur = getCurrency('EUR');
    expect(eur).toBeDefined();
    expect(eur!.code).toBe('EUR');
    expect(eur!.symbol).toBe('€');
  });

  it('returns PKR currency object', () => {
    const pkr = getCurrency('PKR');
    expect(pkr).toBeDefined();
    expect(pkr!.code).toBe('PKR');
  });

  it('returns JPY with 0 decimal digits', () => {
    const jpy = getCurrency('JPY');
    expect(jpy).toBeDefined();
    expect(jpy!.decimalDigits).toBe(0);
  });

  it('returns undefined for invalid currency code', () => {
    expect(getCurrency('XYZ')).toBeUndefined();
    expect(getCurrency('')).toBeUndefined();
  });

  it('is case-sensitive (lowercase fails)', () => {
    expect(getCurrency('usd')).toBeUndefined();
  });
});

// ============================================================
// Currency Symbol
// ============================================================
describe('getCurrencySymbol', () => {
  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns € for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('returns the code itself for unknown currency', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });
});

// ============================================================
// Format Currency Amount
// ============================================================
describe('formatCurrencyAmount', () => {
  it('formats USD with $ prefix', () => {
    const result = formatCurrencyAmount(1234.56, 'USD');
    expect(result).toContain('$');
    expect(result).toContain('1');
    // Should have 2 decimal places
    expect(result).toMatch(/\d+\.\d{2}/);
  });

  it('formats JPY with 0 decimal digits', () => {
    const result = formatCurrencyAmount(1000, 'JPY');
    expect(result).toContain('¥');
    // JPY has 0 decimal digits
    expect(result).not.toContain('.');
  });

  it('falls back gracefully for unknown currency', () => {
    const result = formatCurrencyAmount(100, 'XYZ');
    expect(result).toContain('XYZ');
    expect(result).toContain('100');
  });

  it('handles negative amounts', () => {
    const result = formatCurrencyAmount(-50, 'USD');
    expect(result).toContain('-');
  });

  it('handles zero amount', () => {
    const result = formatCurrencyAmount(0, 'USD');
    expect(result).toContain('0');
  });

  // Compact formatting
  it('formats large amounts in compact mode', () => {
    const result = formatCurrencyAmount(1500000, 'USD', { compact: true });
    expect(result).toContain('M');
  });

  it('formats thousands in compact mode', () => {
    const result = formatCurrencyAmount(5000, 'USD', { compact: true });
    expect(result).toContain('K');
  });

  it('does not compact amounts under 1000', () => {
    const result = formatCurrencyAmount(999, 'USD', { compact: true });
    expect(result).not.toContain('K');
    expect(result).not.toContain('M');
  });

  // Show code option
  it('appends currency code when showCode is true', () => {
    const result = formatCurrencyAmount(100, 'USD', { showCode: true });
    expect(result).toContain('USD');
  });

  // Native symbol
  it('uses native symbol when useNativeSymbol is true', () => {
    const result = formatCurrencyAmount(100, 'USD', { useNativeSymbol: true });
    expect(result).toContain('$');
  });
});

// ============================================================
// Currency Collections
// ============================================================
describe('CURRENCIES collection', () => {
  it('has a large number of currencies (100+)', () => {
    expect(CURRENCIES.length).toBeGreaterThan(100);
  });

  it('every currency has required fields', () => {
    for (const c of CURRENCIES) {
      expect(c.code).toBeDefined();
      expect(c.code.length).toBe(3);
      expect(c.name).toBeDefined();
      expect(c.symbol).toBeDefined();
      expect(c.symbolNative).toBeDefined();
      expect(typeof c.decimalDigits).toBe('number');
      expect(c.region).toBeDefined();
    }
  });

  it('has no duplicate currency codes', () => {
    const codes = CURRENCIES.map(c => c.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});

describe('POPULAR_CURRENCY_CODES', () => {
  it('includes USD, EUR, GBP, PKR', () => {
    expect(POPULAR_CURRENCY_CODES).toContain('USD');
    expect(POPULAR_CURRENCY_CODES).toContain('EUR');
    expect(POPULAR_CURRENCY_CODES).toContain('GBP');
    expect(POPULAR_CURRENCY_CODES).toContain('PKR');
  });

  it('all popular codes exist in CURRENCIES', () => {
    for (const code of POPULAR_CURRENCY_CODES) {
      expect(getCurrency(code)).toBeDefined();
    }
  });
});

describe('DEFAULT_CURRENCY_CODE', () => {
  it('is USD', () => {
    expect(DEFAULT_CURRENCY_CODE).toBe('USD');
  });
});

// ============================================================
// Popular Currencies
// ============================================================
describe('getPopularCurrencies', () => {
  it('returns Currency objects (not just codes)', () => {
    const popular = getPopularCurrencies();
    expect(popular.length).toBe(POPULAR_CURRENCY_CODES.length);
    for (const c of popular) {
      expect(c.code).toBeDefined();
      expect(c.name).toBeDefined();
    }
  });
});

// ============================================================
// Region Functions
// ============================================================
describe('getCurrenciesByRegion', () => {
  it('returns currencies for north_america', () => {
    const na = getCurrenciesByRegion('north_america');
    expect(na.length).toBeGreaterThan(0);
    expect(na.some(c => c.code === 'USD')).toBe(true);
  });

  it('returns currencies for europe', () => {
    const eu = getCurrenciesByRegion('europe');
    expect(eu.length).toBeGreaterThan(0);
    expect(eu.some(c => c.code === 'EUR')).toBe(true);
  });

  it('all returned currencies have the correct region', () => {
    const asia = getCurrenciesByRegion('asia');
    for (const c of asia) {
      expect(c.region).toBe('asia');
    }
  });
});

describe('getAllRegions', () => {
  it('returns all 8 regions', () => {
    const regions = getAllRegions();
    expect(regions.length).toBe(8);
    expect(regions).toContain('north_america');
    expect(regions).toContain('europe');
    expect(regions).toContain('asia');
    expect(regions).toContain('middle_east');
    expect(regions).toContain('africa');
    expect(regions).toContain('oceania');
    expect(regions).toContain('caribbean');
    expect(regions).toContain('south_america');
  });
});

describe('REGION_NAMES', () => {
  it('maps every region to a display name', () => {
    const regions = getAllRegions();
    for (const r of regions) {
      expect(REGION_NAMES[r]).toBeDefined();
      expect(typeof REGION_NAMES[r]).toBe('string');
    }
  });
});

// ============================================================
// Search Currencies
// ============================================================
describe('searchCurrencies', () => {
  it('finds USD by code', () => {
    const results = searchCurrencies('USD');
    expect(results.some(c => c.code === 'USD')).toBe(true);
  });

  it('finds currencies by partial name', () => {
    const results = searchCurrencies('Dollar');
    expect(results.length).toBeGreaterThan(0);
    for (const c of results) {
      expect(c.name.toLowerCase()).toContain('dollar');
    }
  });

  it('finds currencies by symbol', () => {
    const results = searchCurrencies('€');
    expect(results.some(c => c.code === 'EUR')).toBe(true);
  });

  it('is case-insensitive', () => {
    const results = searchCurrencies('usd');
    expect(results.some(c => c.code === 'USD')).toBe(true);
  });

  it('returns empty array for empty query', () => {
    expect(searchCurrencies('')).toEqual([]);
  });

  it('returns empty array for whitespace-only query', () => {
    expect(searchCurrencies('   ')).toEqual([]);
  });

  it('returns empty array for nonsense query', () => {
    expect(searchCurrencies('zzzzzzz')).toEqual([]);
  });
});
