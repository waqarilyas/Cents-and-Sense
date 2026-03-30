import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Category, getDatabase } from "../database";
import {
  validateString,
  validateId,
  ValidationError,
} from "../utils/validation";
import { Alert } from "react-native";

interface CategoryContextType {
  categories: Category[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  loading: boolean;
  error: string | null;
  addCategory: (
    name: string,
    type: "income" | "expense",
    color: string,
  ) => Promise<void>;
  updateCategory: (id: string, name: string, color: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategory: (id: string) => Category | undefined;
  getCategoriesByType: (type: "income" | "expense") => Category[];
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(
  undefined,
);

// Default categories to seed the database - Expanded premium set
const DEFAULT_CATEGORIES = [
  // Expense Categories (comprehensive)
  { name: "Food & Dining", type: "expense", color: "#F97316" },
  { name: "Coffee & Cafe", type: "expense", color: "#92400E" },
  { name: "Groceries", type: "expense", color: "#22C55E" },
  { name: "Transportation", type: "expense", color: "#8B5CF6" },
  { name: "Shopping", type: "expense", color: "#EC4899" },
  { name: "Entertainment", type: "expense", color: "#A855F7" },
  { name: "Health & Fitness", type: "expense", color: "#EF4444" },
  { name: "Bills & Utilities", type: "expense", color: "#EAB308" },
  { name: "Housing", type: "expense", color: "#6366F1" },
  { name: "Travel", type: "expense", color: "#0EA5E9" },
  { name: "Education", type: "expense", color: "#14B8A6" },
  { name: "Personal Care", type: "expense", color: "#F472B6" },
  { name: "Pets", type: "expense", color: "#FB923C" },
  { name: "Kids & Family", type: "expense", color: "#FB7185" },
  { name: "Insurance", type: "expense", color: "#4B5563" },
  { name: "Gifts & Donations", type: "expense", color: "#F43F5E" },
  { name: "Alcohol & Bars", type: "expense", color: "#B45309" },
  { name: "Subscriptions", type: "expense", color: "#7C3AED" },
  { name: "ATM & Cash", type: "expense", color: "#059669" },
  { name: "Fees & Charges", type: "expense", color: "#DC2626" },
  { name: "Taxes", type: "expense", color: "#1F2937" },
  { name: "Other Expense", type: "expense", color: "#64748B" },
  // Income Categories (comprehensive)
  { name: "Salary", type: "income", color: "#22C55E" },
  { name: "Freelance", type: "income", color: "#10B981" },
  { name: "Business Income", type: "income", color: "#0D9488" },
  { name: "Investment", type: "income", color: "#059669" },
  { name: "Rental Income", type: "income", color: "#0891B2" },
  { name: "Refund", type: "income", color: "#6366F1" },
  { name: "Gift Received", type: "income", color: "#F43F5E" },
  { name: "Government", type: "income", color: "#1D4ED8" },
  { name: "Other Income", type: "income", color: "#64748B" },
] as const;

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFixedIds = React.useRef(false);

  // Separate function to fix invalid category IDs - runs independently
  const fixInvalidCategoryIds = useCallback(async () => {
    try {
      const db = await getDatabase();

      // Temporarily disable FK constraints so we can safely re-key categories
      await db.execAsync("PRAGMA foreign_keys = OFF;");

      const existingCategories = await db.getAllAsync<Category>(
        "SELECT * FROM categories",
      );

      for (const cat of existingCategories) {
        // Check if ID contains invalid characters (anything other than alphanumeric, hyphen, underscore)
        if (!/^[a-zA-Z0-9-_]+$/.test(cat.id)) {
          console.log(`Fixing invalid category ID: ${cat.id}`);

          // Generate new valid ID
          const newId = `cat_${cat.name.toLowerCase().replace(/[^a-z0-9-]+/g, "_")}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          // Update the category with new ID in a transaction
          await db.execAsync("BEGIN TRANSACTION");
          try {
            // 1. Insert new category FIRST (so FK references can point to it)
            await db.runAsync(
              "INSERT INTO categories (id, name, type, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
              [newId, cat.name, cat.type, cat.color, cat.createdAt, cat.createdAt],
            );

            // 2. Update all references from old ID to new ID
            await db.runAsync(
              "UPDATE transactions SET categoryId = ? WHERE categoryId = ?",
              [newId, cat.id],
            );
            await db.runAsync(
              "UPDATE budgets SET categoryId = ? WHERE categoryId = ?",
              [newId, cat.id],
            );
            await db.runAsync(
              "UPDATE subscriptions SET categoryId = ? WHERE categoryId = ?",
              [newId, cat.id],
            );

            // 3. Delete old category (now has no references)
            await db.runAsync("DELETE FROM categories WHERE id = ?", [cat.id]);

            await db.execAsync("COMMIT");
            console.log(`Fixed category ID: ${cat.id} -> ${newId}`);
          } catch (err) {
            await db.execAsync("ROLLBACK");
            console.error(`❌ Failed to fix category ID ${cat.id}:`, err);
          }
        }
      }

      // Re-enable FK constraints
      await db.execAsync("PRAGMA foreign_keys = ON;");
    } catch (err) {
      console.error("Error fixing category IDs:", err);
    }
  }, []);

  const seedDefaultCategories = useCallback(async () => {
    try {
      const db = await getDatabase();

      // Seed default categories if they don't exist
      for (const cat of DEFAULT_CATEGORIES) {
        // Replace all non-alphanumeric characters (except hyphens) with underscores
        const id = `cat_${cat.name.toLowerCase().replace(/[^a-z0-9-]+/g, "_")}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.runAsync(
          "INSERT OR IGNORE INTO categories (id, name, type, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
          [id, cat.name, cat.type, cat.color, Date.now(), Date.now()],
        );
      }
    } catch (err) {
      console.error("Error seeding categories:", err);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = await getDatabase();

      // Fix invalid IDs only on first load
      if (!hasFixedIds.current) {
        hasFixedIds.current = true;
        await fixInvalidCategoryIds();
      }

      let result = await db.getAllAsync<Category>(
        "SELECT * FROM categories WHERE deletedAt IS NULL ORDER BY name ASC",
      );

      // If no categories exist, seed defaults
      if (!result || result.length === 0) {
        await seedDefaultCategories();
        result = await db.getAllAsync<Category>(
          "SELECT * FROM categories WHERE deletedAt IS NULL ORDER BY name ASC",
        );
      }

      setCategories(result || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load categories",
      );
      console.error("Error loading categories:", err);
    } finally {
      setLoading(false);
    }
  }, [seedDefaultCategories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const addCategory = useCallback(
    async (name: string, type: "income" | "expense", color: string) => {
      try {
        // Validate inputs
        const validName = validateString(name, "category name", {
          minLength: 1,
          maxLength: 50,
        });
        const validColor = validateString(color, "color", {
          minLength: 4,
          maxLength: 9,
        });

        const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const db = await getDatabase();
        await db.runAsync(
          "INSERT INTO categories (id, name, type, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
          [id, validName, type, validColor, Date.now(), Date.now()],
        );

        await loadCategories();
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        const message =
          error instanceof Error ? error.message : "Failed to add category";
        setError(message);
        throw error;
      }
    },
    [loadCategories],
  );

  const updateCategory = useCallback(
    async (id: string, name: string, color: string) => {
      const oldCategory = categories.find((c) => c.id === id);
      if (!oldCategory) {
        throw new Error("Category not found");
      }

      // Optimistic update
      const updatedCategory = { ...oldCategory, name, color };
      setCategories((prev) =>
        prev
          .map((c) => (c.id === id ? updatedCategory : c))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setError(null);

      try {
        // Validate inputs
        const validId = validateId(id, "id");
        const validName = validateString(name, "category name", {
          minLength: 1,
          maxLength: 50,
        });
        const validColor = validateString(color, "color", {
          minLength: 4,
          maxLength: 9,
        });

        const db = await getDatabase();
        await db.runAsync(
          "UPDATE categories SET name = ?, color = ?, updatedAt = ? WHERE id = ?",
          [validName, validColor, Date.now(), validId],
        );

        await loadCategories();
      } catch (error) {
        if (error instanceof ValidationError) {
          Alert.alert("Invalid Input", error.message);
        }
        const message =
          error instanceof Error ? error.message : "Failed to update category";
        setError(message);
        throw error;
      }
    },
    [categories, loadCategories],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      // Check for linked subscriptions and budgets at the DB level before deleting
      const db = await getDatabase();

      const linkedSubscription = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM subscriptions WHERE categoryId = ? LIMIT 1",
        [id],
      );
      if (linkedSubscription) {
        throw new Error(
          "This category has active subscriptions. Remove them first before deleting.",
        );
      }

      const linkedBudget = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM budgets WHERE categoryId = ? LIMIT 1",
        [id],
      );
      if (linkedBudget) {
        throw new Error(
          "This category has budgets linked to it. Remove them first before deleting.",
        );
      }

      // Optimistic update - remove from UI immediately
      const previousCategories = [...categories];
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setError(null);

      try {
        const now = Date.now();
        await db.runAsync(
          "UPDATE categories SET deletedAt = ?, updatedAt = ? WHERE id = ?",
          [now, now, id],
        );
      } catch (err) {
        // Rollback on error
        setCategories(previousCategories);
        const message =
          err instanceof Error ? err.message : "Failed to delete category";
        setError(message);
        throw err;
      }
    },
    [categories],
  );

  const getCategory = useCallback(
    (id: string) => {
      return categories.find((c) => c.id === id);
    },
    [categories],
  );

  const getCategoriesByType = useCallback(
    (type: "income" | "expense") => {
      return categories.filter((c) => c.type === type);
    },
    [categories],
  );

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories],
  );

  return (
    <CategoryContext.Provider
      value={{
        categories,
        expenseCategories,
        incomeCategories,
        loading,
        error,
        addCategory,
        updateCategory,
        deleteCategory,
        getCategory,
        getCategoriesByType,
        refreshCategories: loadCategories,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within CategoryProvider");
  }
  return context;
}
