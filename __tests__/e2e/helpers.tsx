/**
 * E2E Test Helpers
 *
 * Provides a realistic in-memory database mock and a full multi-provider
 * wrapper so we can test complete user flows across all contexts.
 */
import React, { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ================================================================
// In-memory SQL-ish database that tracks rows across tables
// ================================================================
type Row = Record<string, any>;

class InMemoryDB {
  private tables: Record<string, Row[]> = {};

  constructor() {
    this.reset();
  }

  reset() {
    this.tables = {
      user_profile: [],
      accounts: [],
      categories: [],
      transactions: [],
      budgets: [],
      goals: [],
      subscriptions: [],
      monthly_budgets: [],
      budget_settings: [],
      budget_period_snapshots: [],
    };
  }

  // ---- helpers ----
  private parseWhere(sql: string, params: any[]): (row: Row) => boolean {
    // Very simplified SQL WHERE parser for test purposes
    // Handles: WHERE col = ? AND col2 = ? patterns
    const whereMatch = sql.match(
      /WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s+GROUP|\s*$)/i,
    );
    if (!whereMatch) return () => true;

    const clause = whereMatch[1].trim();
    // Handle "id = ?" or "col = ? AND col2 = ?"
    const conditions = clause.split(/\s+AND\s+/i);
    let paramIdx = this.countParamsBefore(sql, whereMatch.index!);

    const filters: Array<(row: Row) => boolean> = [];
    for (const cond of conditions) {
      const m = cond.trim().match(/^(\w+)\s*(=|!=|<|>|<=|>=|IN)\s*\?$/i);
      if (m) {
        const col = m[1];
        const op = m[2];
        const val = params[paramIdx++];
        filters.push((row) => {
          switch (op) {
            case "=":
              return row[col] === val || row[col] == val;
            case "!=":
              return row[col] !== val;
            case "<":
              return row[col] < val;
            case ">":
              return row[col] > val;
            case "<=":
              return row[col] <= val;
            case ">=":
              return row[col] >= val;
            default:
              return true;
          }
        });
      } else if (cond.trim().match(/^(\w+)\s+IS\s+NOT\s+NULL$/i)) {
        const col = cond.trim().match(/^(\w+)/i)![1];
        filters.push((row) => row[col] != null);
      } else if (cond.trim().match(/^(\w+)\s+IS\s+NULL$/i)) {
        const col = cond.trim().match(/^(\w+)/i)![1];
        filters.push((row) => row[col] == null);
      }
    }
    return (row) => filters.every((f) => f(row));
  }

  private countParamsBefore(sql: string, whereStart: number): number {
    // Count ? marks before the WHERE clause
    return (sql.substring(0, whereStart).match(/\?/g) || []).length;
  }

  private detectTable(sql: string): string | null {
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (fromMatch) return fromMatch[1];
    const intoMatch = sql.match(/INTO\s+(\w+)/i);
    if (intoMatch) return intoMatch[1];
    const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (updateMatch) return updateMatch[1];
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (deleteMatch) return deleteMatch[1];
    return null;
  }

  private ensureTable(name: string) {
    if (!this.tables[name]) this.tables[name] = [];
  }

  // ---- Public API matching expo-sqlite ----

  async getAllAsync(sql: string, params: any[] = []): Promise<Row[]> {
    const table = this.detectTable(sql);
    if (!table) return [];
    this.ensureTable(table);

    const filter = this.parseWhere(sql, params);
    let results = this.tables[table].filter(filter);

    // Handle ORDER BY ... DESC
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const dir = orderMatch[2].toUpperCase();
      results.sort((a, b) =>
        dir === "DESC" ? b[col] - a[col] : a[col] - b[col],
      );
    }

    // Handle LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      results = results.slice(0, parseInt(limitMatch[1]));
    }

    return results;
  }

  async getFirstAsync(sql: string, params: any[] = []): Promise<Row | null> {
    const results = await this.getAllAsync(sql, params);
    return results[0] || null;
  }

  async runAsync(
    sql: string,
    params: any[] = [],
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const table = this.detectTable(sql);
    const sqlUpper = sql.trim().toUpperCase();

    if (sqlUpper.startsWith("INSERT")) {
      if (!table) return { changes: 0, lastInsertRowId: 0 };
      this.ensureTable(table);

      // Parse INSERT INTO table (col1, col2, ...) VALUES (?, ?, ...)
      const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
      const valMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
      if (colMatch && valMatch) {
        const cols = colMatch[1].split(",").map((c) => c.trim());
        const valTokens = valMatch[1].split(",").map((v) => v.trim());
        const row: Row = {};
        let paramIdx = 0;
        cols.forEach((col, i) => {
          const token = valTokens[i];
          if (token === "?") {
            row[col] = params[paramIdx++];
          } else {
            // Literal value — strip quotes if present
            const strMatch = token.match(/^'(.*)'$/);
            if (strMatch) {
              row[col] = strMatch[1];
            } else if (token.toUpperCase() === "NULL") {
              row[col] = null;
            } else {
              row[col] = Number(token) || token;
            }
          }
        });
        this.tables[table].push(row);
        return { changes: 1, lastInsertRowId: this.tables[table].length };
      }
      return { changes: 0, lastInsertRowId: 0 };
    }

    if (sqlUpper.startsWith("UPDATE")) {
      if (!table) return { changes: 0, lastInsertRowId: 0 };
      this.ensureTable(table);

      // Parse SET col1 = ?, col2 = ?, col = col + ?, etc.
      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
      if (!setMatch) {
        // Handle UPDATE without WHERE (SET ... at end of query)
        const setMatchNoWhere = sql.match(/SET\s+(.+?)$/i);
        if (!setMatchNoWhere) return { changes: 0, lastInsertRowId: 0 };
      }

      const setClause = (sql.match(/SET\s+(.+?)\s+WHERE/i) ||
        sql.match(/SET\s+(.+?)$/i))![1];
      const assignments = setClause.split(",").map((s) => s.trim());

      type Setter = (row: Row, paramVal: any) => void;
      const setters: Array<{ setter: Setter; paramIdx: number }> = [];
      let setParamIdx = 0;

      for (const a of assignments) {
        // col = col + ? (increment)
        const incrMatch = a.match(/^(\w+)\s*=\s*\1\s*\+\s*\?$/);
        if (incrMatch) {
          const col = incrMatch[1];
          const idx = setParamIdx++;
          setters.push({
            setter: (row, val) => {
              row[col] = (row[col] || 0) + val;
            },
            paramIdx: idx,
          });
          continue;
        }
        // col = col - ? (decrement)
        const decrMatch = a.match(/^(\w+)\s*=\s*\1\s*-\s*\?$/);
        if (decrMatch) {
          const col = decrMatch[1];
          const idx = setParamIdx++;
          setters.push({
            setter: (row, val) => {
              row[col] = (row[col] || 0) - val;
            },
            paramIdx: idx,
          });
          continue;
        }
        // col = ? (simple assignment)
        const simpleMatch = a.match(/^(\w+)\s*=\s*\?$/);
        if (simpleMatch) {
          const col = simpleMatch[1];
          const idx = setParamIdx++;
          setters.push({
            setter: (row, val) => {
              row[col] = val;
            },
            paramIdx: idx,
          });
          continue;
        }
        // col = literal_number (e.g., isDefault = 0)
        const literalNumMatch = a.match(/^(\w+)\s*=\s*(\d+(?:\.\d+)?)$/);
        if (literalNumMatch) {
          const col = literalNumMatch[1];
          const val = Number(literalNumMatch[2]);
          setters.push({
            setter: (row) => {
              row[col] = val;
            },
            paramIdx: -1,
          });
          continue;
        }
        // col = 'literal_string'
        const literalStrMatch = a.match(/^(\w+)\s*=\s*'([^']*)'$/);
        if (literalStrMatch) {
          const col = literalStrMatch[1];
          const val = literalStrMatch[2];
          setters.push({
            setter: (row) => {
              row[col] = val;
            },
            paramIdx: -1,
          });
          continue;
        }
        // col = NULL
        const literalNullMatch = a.match(/^(\w+)\s*=\s*NULL$/i);
        if (literalNullMatch) {
          const col = literalNullMatch[1];
          setters.push({
            setter: (row) => {
              row[col] = null;
            },
            paramIdx: -1,
          });
          continue;
        }
        // col = COALESCE(col, 0) + ? or similar — treat as increment
        const coalesceMatch = a.match(
          /^(\w+)\s*=\s*COALESCE\s*\(\s*\1\s*,\s*\d+\s*\)\s*\+\s*\?$/i,
        );
        if (coalesceMatch) {
          const col = coalesceMatch[1];
          const idx = setParamIdx++;
          setters.push({
            setter: (row, val) => {
              row[col] = (row[col] || 0) + val;
            },
            paramIdx: idx,
          });
          continue;
        }
      }

      const filter = this.parseWhere(sql, params);
      let changes = 0;
      for (const row of this.tables[table]) {
        if (filter(row)) {
          for (const { setter, paramIdx } of setters) {
            setter(row, params[paramIdx]);
          }
          changes++;
        }
      }
      return { changes, lastInsertRowId: 0 };
    }

    if (sqlUpper.startsWith("DELETE")) {
      if (!table) return { changes: 0, lastInsertRowId: 0 };
      this.ensureTable(table);

      const filter = this.parseWhere(sql, params);
      const before = this.tables[table].length;
      this.tables[table] = this.tables[table].filter((row) => !filter(row));
      return {
        changes: before - this.tables[table].length,
        lastInsertRowId: 0,
      };
    }

    return { changes: 0, lastInsertRowId: 0 };
  }

  async execAsync(sql: string): Promise<void> {
    // For CREATE TABLE, BEGIN, COMMIT, etc. — no-op in our mock
  }

  // Direct access for test assertions
  getTable(name: string): Row[] {
    const rows = this.tables[name] || [];
    return rows.filter((row) => row.deletedAt == null);
  }

  insertDirect(table: string, row: Row) {
    this.ensureTable(table);
    this.tables[table].push(row);
  }
}

// Singleton shared by all contexts in a test
export const testDB = new InMemoryDB();

// ================================================================
// Database module mock — must be called before importing contexts
// ================================================================
export function setupDatabaseMock() {
  jest.mock("../../lib/database", () => ({
    getDatabase: jest.fn(async () => testDB),
    initializeDatabase: jest.fn(async () => {}),
  }));
}

// ================================================================
// AsyncStorage helpers
// ================================================================
export function resetAsyncStorage() {
  (AsyncStorage.getItem as jest.Mock).mockReset().mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockReset().mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
  (AsyncStorage.clear as jest.Mock).mockReset().mockResolvedValue(undefined);
}

// ================================================================
// Full App Provider Wrapper (matches _layout.tsx nesting)
// ================================================================
export function createAppWrapper() {
  // Dynamic imports to ensure mocks are in place
  const { SettingsProvider } = require("../../lib/contexts/SettingsContext");
  const { UserProvider } = require("../../lib/contexts/UserContext");
  const { CurrencyProvider } = require("../../lib/contexts/CurrencyContext");
  const { AccountProvider } = require("../../lib/contexts/AccountContext");
  const { CategoryProvider } = require("../../lib/contexts/CategoryContext");
  const {
    TransactionProvider,
  } = require("../../lib/contexts/TransactionContext");
  const { BudgetProvider } = require("../../lib/contexts/BudgetContext");
  const { GoalProvider } = require("../../lib/contexts/GoalContext");
  const {
    SubscriptionProvider,
  } = require("../../lib/contexts/SubscriptionContext");

  return function AppWrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      SettingsProvider,
      null,
      React.createElement(
        UserProvider,
        null,
        React.createElement(
          CurrencyProvider,
          null,
          React.createElement(
            AccountProvider,
            null,
            React.createElement(
              CategoryProvider,
              null,
              React.createElement(
                TransactionProvider,
                null,
                React.createElement(
                  BudgetProvider,
                  null,
                  React.createElement(
                    GoalProvider,
                    null,
                    React.createElement(SubscriptionProvider, null, children),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  };
}

// ================================================================
// Common test data generators
// ================================================================
export const now = Date.now();
export const oneDay = 86400000;
export const oneMonth = 30 * oneDay;

export function makeTimestamp(daysFromNow: number = 0): number {
  return now + daysFromNow * oneDay;
}

// ================================================================
// Wait helper — let providers initialize
// ================================================================
export async function waitForProviders(ms = 150) {
  return new Promise((r) => setTimeout(r, ms));
}
