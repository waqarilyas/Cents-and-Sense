// Global test setup — mocks for native modules

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  Link: "Link",
}));

// Mock expo-sqlite
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(),
  openDatabaseSync: jest.fn(),
}));

// Mock @react-native-async-storage/async-storage
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));

// Mock react-native-paper
jest.mock("react-native-paper", () => ({
  Text: "Text",
  Button: "Button",
  TextInput: "TextInput",
  ActivityIndicator: "ActivityIndicator",
  Provider: ({ children }: any) => children,
}));

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock WidgetService (default + named export)
jest.mock("../lib/services/WidgetService", () => {
  const ws = {
    updateAllWidgets: jest.fn().mockResolvedValue(undefined),
    queueUpdate: jest.fn(),
  };
  return {
    __esModule: true,
    default: ws,
    widgetService: ws,
    WidgetService: jest.fn(() => ws),
  };
});

// Suppress act() warnings in console
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("act(...)")) return;
  originalWarn(...args);
};
console.error = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("act(...)")) return;
  originalError(...args);
};

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
