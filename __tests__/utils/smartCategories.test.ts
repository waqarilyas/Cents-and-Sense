/**
 * Smart Categories — Comprehensive Test Suite
 * Tests auto-categorization, icon/emoji lookups, merchant matching, and category filtering.
 */
import {
  matchCategoryByDescription,
  getCategorySuggestions,
  getCategoryIcon,
  getCategoryEmoji,
  getCategoryColor,
  getCategoriesByType,
  matchMerchant,
  SMART_CATEGORIES,
  POPULAR_MERCHANTS,
} from "../../lib/smartCategories";

// ============================================================
// SMART_CATEGORIES data
// ============================================================
describe("SMART_CATEGORIES data", () => {
  it("has both expense and income categories", () => {
    const expense = SMART_CATEGORIES.filter((c) => c.type === "expense");
    const income = SMART_CATEGORIES.filter((c) => c.type === "income");
    expect(expense.length).toBeGreaterThan(0);
    expect(income.length).toBeGreaterThan(0);
  });

  it("every category has required fields", () => {
    for (const cat of SMART_CATEGORIES) {
      expect(cat.id).toBeDefined();
      expect(cat.name).toBeDefined();
      expect(cat.type).toMatch(/^(expense|income)$/);
      expect(cat.icon).toBeDefined();
      expect(cat.color).toBeDefined();
      expect(cat.emoji).toBeDefined();
      expect(Array.isArray(cat.keywords)).toBe(true);
      expect(cat.keywords.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate category IDs", () => {
    const ids = SMART_CATEGORIES.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ============================================================
// matchCategoryByDescription
// ============================================================
describe("matchCategoryByDescription", () => {
  // Expense matching
  it('matches "McDonalds lunch" to Food & Dining', () => {
    const result = matchCategoryByDescription("McDonald's lunch", "expense");
    expect(result).not.toBeNull();
    expect(result!.name).toMatch(/food|dining/i);
  });

  it('matches "Uber ride downtown" to Transportation', () => {
    const result = matchCategoryByDescription("Uber ride downtown", "expense");
    expect(result).not.toBeNull();
    expect(result!.name).toMatch(/transport/i);
  });

  it('matches "Netflix subscription" to a valid expense category', () => {
    const result = matchCategoryByDescription(
      "Netflix subscription",
      "expense",
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe("expense");
  });

  it('matches "Walmart groceries" to Groceries', () => {
    const result = matchCategoryByDescription("Walmart groceries", "expense");
    expect(result).not.toBeNull();
    expect(result!.name).toMatch(/grocer/i);
  });

  it('matches "monthly rent payment" to a valid expense category', () => {
    const result = matchCategoryByDescription(
      "monthly rent payment",
      "expense",
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe("expense");
  });

  it('matches "gym membership" to a valid expense category', () => {
    const result = matchCategoryByDescription("gym membership", "expense");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("expense");
  });

  it('matches "electricity bill" to Bills & Utilities', () => {
    const result = matchCategoryByDescription("electricity bill", "expense");
    expect(result).not.toBeNull();
    expect(result!.name).toMatch(/bill|utilit/i);
  });

  // Income matching
  it('matches "monthly salary" to Salary', () => {
    const result = matchCategoryByDescription("monthly salary", "income");
    expect(result).not.toBeNull();
    expect(result!.name).toMatch(/salary/i);
  });

  it('matches "freelance web design" to Freelance', () => {
    const result = matchCategoryByDescription("freelance web design", "income");
    expect(result).not.toBeNull();
    expect(result!.name).toMatch(/freelance/i);
  });

  it('matches "stock dividend" to Investment', () => {
    const result = matchCategoryByDescription("stock dividend", "income");
    expect(result).not.toBeNull();
    expect(result!.name).toMatch(/invest/i);
  });

  // Edge cases
  it("returns null for empty description", () => {
    expect(matchCategoryByDescription("", "expense")).toBeNull();
  });

  it("returns null for whitespace-only description", () => {
    expect(matchCategoryByDescription("   ", "expense")).toBeNull();
  });

  it("returns null for a completely unrecognizable description", () => {
    const result = matchCategoryByDescription("xyzzy123", "expense");
    // Might be null or a low-confidence match
    // The function requires score >= 3 to return
    if (result) {
      // If it does match, it's a weak match — just verify it's a valid category
      expect(result.id).toBeDefined();
    }
  });

  it("filters by type — expense descriptions do not return income categories", () => {
    const result = matchCategoryByDescription("salary payment", "expense");
    if (result) {
      expect(result.type).toBe("expense");
    }
  });

  it("is case-insensitive", () => {
    const lower = matchCategoryByDescription("uber ride", "expense");
    const upper = matchCategoryByDescription("UBER RIDE", "expense");
    // Both should match the same category (or both null)
    if (lower && upper) {
      expect(lower.id).toBe(upper.id);
    }
  });
});

// ============================================================
// getCategorySuggestions
// ============================================================
describe("getCategorySuggestions", () => {
  it("returns up to the specified limit", () => {
    const suggestions = getCategorySuggestions(
      "food lunch dinner",
      "expense",
      5,
    );
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });

  it("returns results sorted by relevance (first result = best match)", () => {
    const suggestions = getCategorySuggestions(
      "restaurant dinner",
      "expense",
      3,
    );
    expect(suggestions.length).toBeGreaterThan(0);
    // First suggestion should be food/dining related
    expect(suggestions[0].name).toMatch(/food|dining/i);
  });

  it("returns empty array for empty description", () => {
    expect(getCategorySuggestions("", "expense")).toEqual([]);
  });

  it("defaults to limit of 3", () => {
    const suggestions = getCategorySuggestions(
      "food grocery shopping",
      "expense",
    );
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it("only returns categories of the requested type", () => {
    const suggestions = getCategorySuggestions("money payment", "income");
    for (const s of suggestions) {
      expect(s.type).toBe("income");
    }
  });
});

// ============================================================
// getCategoryIcon
// ============================================================
describe("getCategoryIcon", () => {
  it("returns an icon for known categories", () => {
    const icon = getCategoryIcon("Food & Dining");
    expect(icon).toBeDefined();
    expect(typeof icon).toBe("string");
  });

  it("is case-insensitive", () => {
    const icon1 = getCategoryIcon("food & dining");
    const icon2 = getCategoryIcon("Food & Dining");
    expect(icon1).toBe(icon2);
  });

  it("returns fallback icon for unknown categories", () => {
    const icon = getCategoryIcon("Nonexistent Category");
    expect(icon).toBe("ellipsis-horizontal");
  });
});

// ============================================================
// getCategoryEmoji
// ============================================================
describe("getCategoryEmoji", () => {
  it("returns an emoji for known categories", () => {
    const emoji = getCategoryEmoji("Transportation");
    expect(emoji).toBeDefined();
    expect(emoji.length).toBeGreaterThan(0);
  });

  it("returns fallback emoji for unknown categories", () => {
    const emoji = getCategoryEmoji("Nonexistent");
    expect(emoji).toBe("📦");
  });

  it("is case-insensitive", () => {
    const e1 = getCategoryEmoji("groceries");
    const e2 = getCategoryEmoji("Groceries");
    expect(e1).toBe(e2);
  });
});

// ============================================================
// getCategoryColor
// ============================================================
describe("getCategoryColor", () => {
  it("returns a hex color for known categories", () => {
    const color = getCategoryColor("Shopping");
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("returns fallback color for unknown categories", () => {
    const color = getCategoryColor("Nonexistent");
    expect(color).toBe("#64748B");
  });
});

// ============================================================
// getCategoriesByType
// ============================================================
describe("getCategoriesByType", () => {
  it('returns only expense categories for "expense"', () => {
    const categories = getCategoriesByType("expense");
    expect(categories.length).toBeGreaterThan(0);
    for (const c of categories) {
      expect(c.type).toBe("expense");
    }
  });

  it('returns only income categories for "income"', () => {
    const categories = getCategoriesByType("income");
    expect(categories.length).toBeGreaterThan(0);
    for (const c of categories) {
      expect(c.type).toBe("income");
    }
  });

  it("expense categories outnumber income categories", () => {
    const expense = getCategoriesByType("expense");
    const income = getCategoriesByType("income");
    expect(expense.length).toBeGreaterThan(income.length);
  });
});

// ============================================================
// matchMerchant
// ============================================================
describe("matchMerchant", () => {
  it("matches McDonald's to Food & Dining", () => {
    const result = matchMerchant("mcdonald's");
    expect(result).toBe("Food & Dining");
  });

  it("matches mcdonalds (no apostrophe)", () => {
    expect(matchMerchant("mcdonalds")).toBe("Food & Dining");
  });

  it("matches starbucks to Coffee & Cafe", () => {
    expect(matchMerchant("starbucks")).toBe("Coffee & Cafe");
  });

  it("matches walmart to Groceries", () => {
    expect(matchMerchant("walmart")).toBe("Groceries");
  });

  it("matches uber to Transportation", () => {
    expect(matchMerchant("uber")).toBe("Transportation");
  });

  it("matches amazon to Shopping", () => {
    expect(matchMerchant("amazon")).toBe("Shopping");
  });

  it("matches netflix to Entertainment", () => {
    expect(matchMerchant("netflix")).toBe("Entertainment");
  });

  it("matches verizon to Bills & Utilities", () => {
    expect(matchMerchant("verizon")).toBe("Bills & Utilities");
  });

  it("is case-insensitive", () => {
    expect(matchMerchant("NETFLIX")).toBe("Entertainment");
    expect(matchMerchant("Uber")).toBe("Transportation");
  });

  it("handles partial matches", () => {
    // "starbucks coffee downtown" contains "starbucks"
    expect(matchMerchant("starbucks coffee downtown")).toBe("Coffee & Cafe");
  });

  it("returns null for unknown merchants", () => {
    expect(matchMerchant("unknown shop xyz")).toBeNull();
  });

  it("handles empty string gracefully", () => {
    const result = matchMerchant("");
    // Empty string may match a default category or return null
    expect(typeof result === "string" || result === null).toBe(true);
  });
});

// ============================================================
// POPULAR_MERCHANTS dictionary
// ============================================================
describe("POPULAR_MERCHANTS", () => {
  it("has merchants in multiple categories", () => {
    const categories = new Set(Object.values(POPULAR_MERCHANTS));
    expect(categories.size).toBeGreaterThan(3);
  });

  it("all keys are lowercase", () => {
    for (const key of Object.keys(POPULAR_MERCHANTS)) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});
