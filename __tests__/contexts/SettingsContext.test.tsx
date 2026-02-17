/**
 * SettingsContext — Comprehensive Test Suite
 * Tests AsyncStorage persistence, updateSetting, updateSettings, resetSettings.
 */
import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  SettingsProvider,
  useSettings,
} from "../../lib/contexts/SettingsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// AsyncStorage is already mocked in setup.ts

const SETTINGS_KEY = "@budget_tracker_settings";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SettingsProvider, null, children);

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

// ============================================================
// Initial State — defaults
// ============================================================
describe("SettingsContext — Initial State", () => {
  it("provides default settings when no stored data", async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.settings.subscriptionProcessingMode).toBe("notify");
    expect(result.current.settings.notificationsEnabled).toBe(true);
    expect(result.current.settings.subscriptionReminderDays).toBe(3);
    expect(result.current.settings.defaultCurrencyCode).toBe("USD");
    expect(result.current.settings.theme).toBe("system");
    expect(result.current.settings.hideBalances).toBe(false);
    expect(result.current.settings.budgetPeriodStartDay).toBe(1);
    expect(result.current.settings.enableBudgetCarryover).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it("loads stored settings from AsyncStorage", async () => {
    const stored = {
      subscriptionProcessingMode: "auto",
      theme: "dark",
      hideBalances: true,
      budgetPeriodStartDay: 15,
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(stored),
    );

    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.settings.subscriptionProcessingMode).toBe("auto");
    expect(result.current.settings.theme).toBe("dark");
    expect(result.current.settings.hideBalances).toBe(true);
    expect(result.current.settings.budgetPeriodStartDay).toBe(15);
    // Non-stored fields keep defaults
    expect(result.current.settings.notificationsEnabled).toBe(true);
    expect(result.current.settings.defaultCurrencyCode).toBe("USD");
  });

  it("merges stored settings with defaults to handle new keys in updates", async () => {
    // Simulate old storage that doesn't have budgetPeriodStartDay
    const oldStored = {
      subscriptionProcessingMode: "manual",
      theme: "light",
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(oldStored),
    );

    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Old values restored
    expect(result.current.settings.subscriptionProcessingMode).toBe("manual");
    expect(result.current.settings.theme).toBe("light");
    // New defaults filled in
    expect(result.current.settings.budgetPeriodStartDay).toBe(1);
    expect(result.current.settings.enableBudgetCarryover).toBe(true);
  });
});

// ============================================================
// updateSetting — single key
// ============================================================
describe("SettingsContext — updateSetting", () => {
  it("updates a single setting and persists", async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateSetting("theme", "dark");
    });

    expect(result.current.settings.theme).toBe("dark");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SETTINGS_KEY,
      expect.stringContaining('"theme":"dark"'),
    );
  });

  it("updates subscriptionProcessingMode", async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateSetting("subscriptionProcessingMode", "auto");
    });

    expect(result.current.settings.subscriptionProcessingMode).toBe("auto");
  });

  it("updates budgetPeriodStartDay", async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateSetting("budgetPeriodStartDay", 15);
    });

    expect(result.current.settings.budgetPeriodStartDay).toBe(15);
  });

  it("updates hideBalances", async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateSetting("hideBalances", true);
    });

    expect(result.current.settings.hideBalances).toBe(true);
  });
});

// ============================================================
// updateSettings — bulk update
// ============================================================
describe("SettingsContext — updateSettings (bulk)", () => {
  it("updates multiple settings at once", async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateSettings({
        theme: "light",
        hideBalances: true,
        subscriptionReminderDays: 7,
      });
    });

    expect(result.current.settings.theme).toBe("light");
    expect(result.current.settings.hideBalances).toBe(true);
    expect(result.current.settings.subscriptionReminderDays).toBe(7);
    // Others untouched
    expect(result.current.settings.subscriptionProcessingMode).toBe("notify");
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

// ============================================================
// resetSettings
// ============================================================
describe("SettingsContext — resetSettings", () => {
  it("resets all settings to defaults", async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Change some settings first
    await act(async () => {
      await result.current.updateSettings({
        theme: "dark",
        hideBalances: true,
        budgetPeriodStartDay: 20,
        enableBudgetCarryover: false,
      });
    });

    expect(result.current.settings.theme).toBe("dark");

    // Reset
    await act(async () => {
      await result.current.resetSettings();
    });

    expect(result.current.settings.theme).toBe("system");
    expect(result.current.settings.hideBalances).toBe(false);
    expect(result.current.settings.budgetPeriodStartDay).toBe(1);
    expect(result.current.settings.enableBudgetCarryover).toBe(true);
    expect(result.current.settings.subscriptionProcessingMode).toBe("notify");
    // Persisted default to storage
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

// ============================================================
// AsyncStorage error handling
// ============================================================
describe("SettingsContext — Error handling", () => {
  it("falls back to defaults when AsyncStorage read fails", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
      new Error("Storage error"),
    );
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useSettings(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.settings.theme).toBe("system");
    expect(result.current.loading).toBe(false);
    spy.mockRestore();
  });
});

// ============================================================
// useSettings guard
// ============================================================
describe("SettingsContext — useSettings guard", () => {
  it("throws when used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useSettings());
    }).toThrow("useSettings must be used within a SettingsProvider");
    spy.mockRestore();
  });
});
