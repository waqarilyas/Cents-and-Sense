/**
 * UserContext — Comprehensive Test Suite
 * Tests dual persistence (AsyncStorage + SQLite), onboarding flow,
 * profile CRUD, and edge case where profile is deleted but onboarding marked complete.
 */
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { UserProvider, useUser } from "../../lib/contexts/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================
// Mock infrastructure
// ============================================================
let mockProfile: any = null;

const mockDb = {
  getFirstAsync: jest.fn(async () => mockProfile),
  runAsync: jest.fn(async () => ({ changes: 1 })),
};

jest.mock("../../lib/database", () => ({
  getDatabase: jest.fn(async () => mockDb),
}));

const ONBOARDING_KEY = "@budget_app_onboarding_complete";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(UserProvider, null, children);

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = null;
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

// ============================================================
// Initial State — Fresh user (no onboarding)
// ============================================================
describe("UserContext — Initial State", () => {
  it("starts with no user and onboarding incomplete", async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.userName).toBeNull();
    expect(result.current.defaultCurrency).toBe("USD");
    expect(result.current.isOnboardingComplete).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it("loads existing profile when onboarding was completed", async () => {
    // AsyncStorage says onboarding complete
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      async (key: string) => {
        if (key === ONBOARDING_KEY) return "true";
        return null;
      },
    );

    // DB has the profile
    mockProfile = {
      id: "user_profile_001",
      name: "Alice",
      defaultCurrency: "EUR",
      onboardingCompleted: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.userName).toBe("Alice");
    expect(result.current.defaultCurrency).toBe("EUR");
    expect(result.current.isOnboardingComplete).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it("resets onboarding when AsyncStorage says complete but DB profile missing", async () => {
    // AsyncStorage says complete but no profile in DB
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      async (key: string) => {
        if (key === ONBOARDING_KEY) return "true";
        return null;
      },
    );
    mockProfile = null;

    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.isOnboardingComplete).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(ONBOARDING_KEY);
  });
});

// ============================================================
// setUserProfile
// ============================================================
describe("UserContext — setUserProfile", () => {
  it("creates new profile when none exists", async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);

    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.setUserProfile("Bob", "GBP");
    });

    expect(result.current.userName).toBe("Bob");
    expect(result.current.defaultCurrency).toBe("GBP");

    const insertCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" && call[0].includes("INSERT"),
    );
    expect(insertCall).toBeDefined();
  });

  it("updates existing profile", async () => {
    // When onboarding is NOT complete (AsyncStorage returns null), loading doesn't hit DB.
    // So the first getFirstAsync call is for setUserProfile's existence check.
    mockDb.getFirstAsync.mockResolvedValueOnce({
      id: "user_profile_001",
      name: "Old",
      defaultCurrency: "USD",
      onboardingCompleted: 1,
    });

    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.setUserProfile("New Name", "JPY");
    });

    expect(result.current.userName).toBe("New Name");
    expect(result.current.defaultCurrency).toBe("JPY");

    const updateCall = mockDb.runAsync.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === "string" && call[0].includes("UPDATE"),
    );
    expect(updateCall).toBeDefined();
  });
});

// ============================================================
// updateUserName
// ============================================================
describe("UserContext — updateUserName", () => {
  it("updates only the user name in DB and state", async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateUserName("Charlie");
    });

    expect(result.current.userName).toBe("Charlie");
    const call = mockDb.runAsync.mock.calls[0] as any[] | undefined;
    expect(call?.[0]).toContain("UPDATE user_profile SET name");
  });
});

// ============================================================
// updateDefaultCurrency
// ============================================================
describe("UserContext — updateDefaultCurrency", () => {
  it("updates only the default currency", async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.updateDefaultCurrency("PKR");
    });

    expect(result.current.defaultCurrency).toBe("PKR");
    const call = mockDb.runAsync.mock.calls[0] as any[] | undefined;
    expect(call?.[0]).toContain("UPDATE user_profile SET defaultCurrency");
  });
});

// ============================================================
// completeOnboarding
// ============================================================
describe("UserContext — completeOnboarding", () => {
  it("marks onboarding complete in both DB and AsyncStorage", async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(result.current.isOnboardingComplete).toBe(true);

    // DB updated
    const dbCall = mockDb.runAsync.mock.calls[0] as any[] | undefined;
    expect(dbCall?.[0]).toContain("onboardingCompleted");

    // AsyncStorage set
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_KEY, "true");
  });
});

// ============================================================
// getUserProfile
// ============================================================
describe("UserContext — getUserProfile", () => {
  it("returns profile from DB", async () => {
    const profileData = {
      id: "user_profile_001",
      name: "Alice",
      defaultCurrency: "USD",
      onboardingCompleted: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Reset any queued values and set up for getUserProfile call
    mockDb.getFirstAsync.mockReset();
    mockDb.getFirstAsync.mockResolvedValueOnce(profileData);

    let profile: any;
    await act(async () => {
      profile = await result.current.getUserProfile();
    });

    expect(profile).toEqual(profileData);
  });

  it("returns null when no profile exists", async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Reset and set up for getUserProfile call
    mockDb.getFirstAsync.mockReset();
    mockDb.getFirstAsync.mockResolvedValueOnce(null);

    let profile: any;
    await act(async () => {
      profile = await result.current.getUserProfile();
    });

    expect(profile).toBeNull();
  });

  it("returns null and logs on DB error", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useUser(), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    mockDb.getFirstAsync.mockRejectedValueOnce(new Error("DB crash"));

    let profile: any;
    await act(async () => {
      profile = await result.current.getUserProfile();
    });

    expect(profile).toBeNull();
    spy.mockRestore();
  });
});

// ============================================================
// useUser guard
// ============================================================
describe("UserContext — useUser guard", () => {
  it("throws when used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useUser());
    }).toThrow("useUser must be used within a UserProvider");
    spy.mockRestore();
  });
});
