/**
 * Validation Utilities — Comprehensive Test Suite
 * Tests every validation function with valid, invalid, and edge-case inputs.
 */
import {
  ValidationError,
  validateAmount,
  validateString,
  validateDate,
  validateId,
  validateTransactionType,
  validateAccountType,
  validateBudgetPeriod,
  validateSubscriptionFrequency,
} from '../../lib/utils/validation';

// ============================================================
// ValidationError
// ============================================================
describe('ValidationError', () => {
  it('creates error with field and value properties', () => {
    const err = new ValidationError('bad value', 'amount', -5);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.message).toBe('bad value');
    expect(err.field).toBe('amount');
    expect(err.value).toBe(-5);
    expect(err.name).toBe('ValidationError');
  });
});

// ============================================================
// validateAmount
// ============================================================
describe('validateAmount', () => {
  // Happy path
  it('accepts a valid positive number', () => {
    expect(validateAmount(100)).toBe(100);
  });

  it('accepts the minimum default amount (0.01)', () => {
    expect(validateAmount(0.01)).toBe(0.01);
  });

  it('accepts the maximum default amount (999999999)', () => {
    expect(validateAmount(999999999)).toBe(999999999);
  });

  it('accepts a decimal amount', () => {
    expect(validateAmount(12.99)).toBe(12.99);
  });

  // Type errors
  it('rejects non-number types (string)', () => {
    expect(() => validateAmount('100' as any)).toThrow(ValidationError);
    expect(() => validateAmount('100' as any)).toThrow('must be a number');
  });

  it('rejects null', () => {
    expect(() => validateAmount(null as any)).toThrow(ValidationError);
  });

  it('rejects undefined', () => {
    expect(() => validateAmount(undefined as any)).toThrow(ValidationError);
  });

  it('rejects boolean', () => {
    expect(() => validateAmount(true as any)).toThrow(ValidationError);
  });

  // Special values
  it('rejects NaN', () => {
    expect(() => validateAmount(NaN)).toThrow('cannot be NaN');
  });

  it('rejects Infinity', () => {
    expect(() => validateAmount(Infinity)).toThrow('must be a finite number');
  });

  it('rejects -Infinity', () => {
    expect(() => validateAmount(-Infinity)).toThrow('must be a finite number');
  });

  // Zero handling
  it('rejects zero by default', () => {
    expect(() => validateAmount(0)).toThrow('cannot be zero');
  });

  it('accepts zero when allowZero is true', () => {
    expect(validateAmount(0, 'amount', { allowZero: true, min: 0 })).toBe(0);
  });

  // Negative handling
  it('rejects negative by default', () => {
    expect(() => validateAmount(-10)).toThrow('cannot be negative');
  });

  it('accepts negative when allowNegative is true', () => {
    expect(validateAmount(-10, 'balance', { allowNegative: true, min: -999999999 })).toBe(-10);
  });

  // Range enforcement
  it('rejects values below custom min', () => {
    expect(() => validateAmount(5, 'amount', { min: 10 })).toThrow('must be at least 10');
  });

  it('rejects values above custom max', () => {
    expect(() => validateAmount(200, 'amount', { max: 100 })).toThrow('cannot exceed 100');
  });

  it('rejects amounts above default max', () => {
    expect(() => validateAmount(1000000000)).toThrow('cannot exceed');
  });

  it('rejects amounts below default min', () => {
    expect(() => validateAmount(0.001)).toThrow('must be at least');
  });

  // Custom field name
  it('uses custom field name in error messages', () => {
    try {
      validateAmount('x' as any, 'price');
      fail('Should have thrown');
    } catch (e: any) {
      expect(e.field).toBe('price');
      expect(e.message).toContain('price');
    }
  });
});

// ============================================================
// validateString
// ============================================================
describe('validateString', () => {
  // Happy path
  it('accepts a valid string', () => {
    expect(validateString('hello', 'name')).toBe('hello');
  });

  it('trims whitespace', () => {
    expect(validateString('  hello  ', 'name')).toBe('hello');
  });

  // Type errors
  it('rejects non-string types (number)', () => {
    expect(() => validateString(123 as any, 'name')).toThrow('must be a string');
  });

  it('rejects null', () => {
    expect(() => validateString(null as any, 'name')).toThrow('must be a string');
  });

  // Required
  it('rejects empty string when required', () => {
    expect(() => validateString('', 'name', { required: true })).toThrow('is required');
  });

  it('rejects whitespace-only when required', () => {
    expect(() => validateString('   ', 'name', { required: true })).toThrow('is required');
  });

  it('accepts empty string when not required', () => {
    expect(validateString('', 'name')).toBe('');
  });

  // Length constraints
  it('rejects strings shorter than minLength', () => {
    expect(() => validateString('ab', 'name', { minLength: 3 })).toThrow('at least 3 characters');
  });

  it('rejects strings longer than maxLength', () => {
    expect(() => validateString('abcdef', 'name', { maxLength: 5 })).toThrow('cannot exceed 5 characters');
  });

  it('accepts strings at exact minLength', () => {
    expect(validateString('abc', 'name', { minLength: 3 })).toBe('abc');
  });

  it('accepts strings at exact maxLength', () => {
    expect(validateString('abcde', 'name', { maxLength: 5 })).toBe('abcde');
  });

  // Pattern matching
  it('rejects strings not matching pattern', () => {
    expect(() => validateString('hello!', 'name', { pattern: /^[a-z]+$/ })).toThrow('invalid format');
  });

  it('accepts strings matching pattern', () => {
    expect(validateString('hello', 'name', { pattern: /^[a-z]+$/ })).toBe('hello');
  });
});

// ============================================================
// validateDate
// ============================================================
describe('validateDate', () => {
  it('accepts a valid timestamp', () => {
    const ts = new Date(2025, 5, 15).getTime();
    expect(validateDate(ts)).toBe(ts);
  });

  it('accepts a Date object', () => {
    const d = new Date(2025, 5, 15);
    expect(validateDate(d)).toBe(d.getTime());
  });

  it('rejects non-date types', () => {
    expect(() => validateDate('2025-01-01')).toThrow('must be a Date or timestamp');
  });

  it('rejects null', () => {
    expect(() => validateDate(null)).toThrow('must be a Date or timestamp');
  });

  it('rejects NaN timestamp', () => {
    expect(() => validateDate(NaN)).toThrow('is invalid');
  });

  it('rejects an invalid Date', () => {
    expect(() => validateDate(new Date('invalid'))).toThrow('is invalid');
  });

  // Range checks
  it('rejects dates before 1900', () => {
    const ancient = new Date(1899, 11, 31).getTime();
    expect(() => validateDate(ancient)).toThrow('out of valid range');
  });

  it('rejects dates after 2100', () => {
    const future = new Date(2101, 0, 1).getTime();
    expect(() => validateDate(future)).toThrow('out of valid range');
  });

  it('accepts dates at range boundaries', () => {
    const min = new Date(1900, 0, 1).getTime();
    const max = new Date(2100, 11, 31).getTime();
    expect(validateDate(min)).toBe(min);
    expect(validateDate(max)).toBe(max);
  });

  it('uses custom field name', () => {
    try {
      validateDate('bad', 'deadline');
      fail('Should have thrown');
    } catch (e: any) {
      expect(e.field).toBe('deadline');
    }
  });
});

// ============================================================
// validateId
// ============================================================
describe('validateId', () => {
  it('accepts valid alphanumeric IDs', () => {
    expect(validateId('abc-123_DEF', 'id')).toBe('abc-123_DEF');
  });

  it('rejects empty string', () => {
    expect(() => validateId('', 'id')).toThrow();
  });

  it('rejects IDs with special characters', () => {
    expect(() => validateId('id@#$', 'id')).toThrow('invalid characters');
  });

  it('rejects IDs with spaces', () => {
    expect(() => validateId('id with space', 'id')).toThrow('invalid characters');
  });

  it('rejects non-string', () => {
    expect(() => validateId(123 as any, 'id')).toThrow('must be a string');
  });

  it('accepts single character ID', () => {
    expect(validateId('a', 'id')).toBe('a');
  });

  it('rejects IDs over 100 characters', () => {
    expect(() => validateId('a'.repeat(101), 'id')).toThrow('cannot exceed 100 characters');
  });
});

// ============================================================
// Type validators
// ============================================================
describe('validateTransactionType', () => {
  it('accepts "income"', () => {
    expect(validateTransactionType('income')).toBe('income');
  });

  it('accepts "expense"', () => {
    expect(validateTransactionType('expense')).toBe('expense');
  });

  it('rejects invalid types', () => {
    expect(() => validateTransactionType('transfer')).toThrow();
    expect(() => validateTransactionType('')).toThrow();
    expect(() => validateTransactionType(null)).toThrow();
  });
});

describe('validateAccountType', () => {
  it('accepts "checking"', () => {
    expect(validateAccountType('checking')).toBe('checking');
  });

  it('accepts "savings"', () => {
    expect(validateAccountType('savings')).toBe('savings');
  });

  it('accepts "credit_card"', () => {
    expect(validateAccountType('credit_card')).toBe('credit_card');
  });

  it('rejects invalid types', () => {
    expect(() => validateAccountType('investment')).toThrow();
    expect(() => validateAccountType('')).toThrow();
  });
});

describe('validateBudgetPeriod', () => {
  it('accepts "monthly"', () => {
    expect(validateBudgetPeriod('monthly')).toBe('monthly');
  });

  it('accepts "yearly"', () => {
    expect(validateBudgetPeriod('yearly')).toBe('yearly');
  });

  it('rejects invalid periods', () => {
    expect(() => validateBudgetPeriod('weekly')).toThrow();
    expect(() => validateBudgetPeriod('')).toThrow();
  });
});

describe('validateSubscriptionFrequency', () => {
  it('accepts all valid frequencies', () => {
    expect(validateSubscriptionFrequency('daily')).toBe('daily');
    expect(validateSubscriptionFrequency('weekly')).toBe('weekly');
    expect(validateSubscriptionFrequency('monthly')).toBe('monthly');
    expect(validateSubscriptionFrequency('yearly')).toBe('yearly');
  });

  it('rejects invalid frequencies', () => {
    expect(() => validateSubscriptionFrequency('biweekly')).toThrow();
    expect(() => validateSubscriptionFrequency('')).toThrow();
    expect(() => validateSubscriptionFrequency(null)).toThrow();
  });
});
