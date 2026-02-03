/**
 * Validation Utilities
 * Comprehensive input validation for all data types
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export const validateAmount = (
  amount: any,
  fieldName: string = "amount",
  options: {
    allowZero?: boolean;
    allowNegative?: boolean;
    min?: number;
    max?: number;
  } = {},
): number => {
  // Check if number
  if (typeof amount !== "number") {
    throw new ValidationError(
      `${fieldName} must be a number`,
      fieldName,
      amount,
    );
  }

  // Check for special values
  if (isNaN(amount)) {
    throw new ValidationError(`${fieldName} cannot be NaN`, fieldName, amount);
  }

  if (!isFinite(amount)) {
    throw new ValidationError(
      `${fieldName} must be a finite number`,
      fieldName,
      amount,
    );
  }

  // Check zero
  if (!options.allowZero && amount === 0) {
    throw new ValidationError(`${fieldName} cannot be zero`, fieldName, amount);
  }

  // Check negative
  if (!options.allowNegative && amount < 0) {
    throw new ValidationError(
      `${fieldName} cannot be negative`,
      fieldName,
      amount,
    );
  }

  // Check range
  const min = options.min ?? 0.01;
  const max = options.max ?? 999999999;

  if (amount < min) {
    throw new ValidationError(
      `${fieldName} must be at least ${min}`,
      fieldName,
      amount,
    );
  }

  if (amount > max) {
    throw new ValidationError(
      `${fieldName} cannot exceed ${max}`,
      fieldName,
      amount,
    );
  }

  return amount;
};

export const validateString = (
  value: any,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  } = {},
): string => {
  if (typeof value !== "string") {
    throw new ValidationError(
      `${fieldName} must be a string`,
      fieldName,
      value,
    );
  }

  const trimmed = value.trim();

  if (options.required && trimmed.length === 0) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }

  if (options.minLength && trimmed.length < options.minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${options.minLength} characters`,
      fieldName,
      value,
    );
  }

  if (options.maxLength && trimmed.length > options.maxLength) {
    throw new ValidationError(
      `${fieldName} cannot exceed ${options.maxLength} characters`,
      fieldName,
      value,
    );
  }

  if (options.pattern && !options.pattern.test(trimmed)) {
    throw new ValidationError(
      `${fieldName} has invalid format`,
      fieldName,
      value,
    );
  }

  return trimmed;
};

export const validateDate = (
  value: any,
  fieldName: string = "date",
): number => {
  let timestamp: number;

  if (typeof value === "number") {
    timestamp = value;
  } else if (value instanceof Date) {
    timestamp = value.getTime();
  } else {
    throw new ValidationError(
      `${fieldName} must be a Date or timestamp`,
      fieldName,
      value,
    );
  }

  if (isNaN(timestamp) || !isFinite(timestamp)) {
    throw new ValidationError(`${fieldName} is invalid`, fieldName, value);
  }

  // Check reasonable range (year 1900 to 2100)
  const minDate = new Date(1900, 0, 1).getTime();
  const maxDate = new Date(2100, 11, 31).getTime();

  if (timestamp < minDate || timestamp > maxDate) {
    throw new ValidationError(
      `${fieldName} is out of valid range`,
      fieldName,
      value,
    );
  }

  return timestamp;
};

export const validateId = (value: any, fieldName: string): string => {
  const id = validateString(value, fieldName, {
    required: true,
    minLength: 1,
    maxLength: 100,
  });

  // Check format (adjust pattern as needed)
  if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
    throw new ValidationError(
      `${fieldName} contains invalid characters`,
      fieldName,
      value,
    );
  }

  return id;
};

export const validateTransactionType = (value: any): "income" | "expense" => {
  if (value !== "income" && value !== "expense") {
    throw new ValidationError(
      'Type must be either "income" or "expense"',
      "type",
      value,
    );
  }
  return value;
};

export const validateAccountType = (
  value: any,
): "checking" | "savings" | "credit_card" => {
  if (value !== "checking" && value !== "savings" && value !== "credit_card") {
    throw new ValidationError(
      'Account type must be "checking", "savings", or "credit_card"',
      "type",
      value,
    );
  }
  return value;
};

export const validateBudgetPeriod = (value: any): "monthly" | "yearly" => {
  if (value !== "monthly" && value !== "yearly") {
    throw new ValidationError(
      'Budget period must be "monthly" or "yearly"',
      "period",
      value,
    );
  }
  return value;
};

export const validateSubscriptionFrequency = (
  value: any,
): "daily" | "weekly" | "monthly" | "yearly" => {
  if (
    value !== "daily" &&
    value !== "weekly" &&
    value !== "monthly" &&
    value !== "yearly"
  ) {
    throw new ValidationError(
      'Frequency must be "daily", "weekly", "monthly", or "yearly"',
      "frequency",
      value,
    );
  }
  return value;
};
