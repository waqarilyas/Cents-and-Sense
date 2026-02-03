/**
 * Native Widget Service
 * Bridge between React Native and native Android widgets
 */

import { NativeModules, Platform } from "react-native";
import { WidgetDataProvider } from "./WidgetDataProvider";

interface WidgetNativeModule {
  updateWidgets(): Promise<void>;
  reloadAllWidgets(): Promise<void>;
  isWidgetSupported(): Promise<boolean>;
  getWidgetDataPath(): Promise<string>;
  writeWidgetData(data: {
    spending: number;
    budget: number;
    currency: string;
    categories: Array<{ name: string; spending: number }>;
  }): Promise<string>;
  writeTestData(): Promise<string>;
}

// Check if native module is available
const isNativeModuleAvailable = !!NativeModules.BudgetWidgetModule;

// Stub module for when native module is not available (Expo Go, web, etc.)
const StubWidgetModule: WidgetNativeModule = {
  updateWidgets: async () => {
    console.log("[WidgetService] Widgets not available - using Expo Go or web");
  },
  reloadAllWidgets: async () => {
    console.log("[WidgetService] Widgets not available - using Expo Go or web");
  },
  isWidgetSupported: async () => false,
  getWidgetDataPath: async () => "",
  writeWidgetData: async () => "",
  writeTestData: async () => "",
};

// Use native module if available, otherwise use stub
const WidgetModule: WidgetNativeModule = isNativeModuleAvailable
  ? NativeModules.BudgetWidgetModule
  : StubWidgetModule;

/**
 * Widget Update Queue
 * Prevents race conditions by queuing widget updates
 */
class WidgetUpdateQueue {
  private isUpdating: boolean = false;
  private pendingUpdate: boolean = false;
  private updateTimeout: NodeJS.Timeout | null = null;

  /**
   * Queue a widget update with debouncing
   * Prevents rapid successive updates
   */
  async updateWidgets(): Promise<void> {
    // If already updating, mark that another update is needed
    if (this.isUpdating) {
      this.pendingUpdate = true;
      return;
    }

    // Clear any pending debounce timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }

    // Start update
    this.isUpdating = true;
    this.pendingUpdate = false;

    try {
      await WidgetDataProvider.writeWidgetData();

      // If another update was requested while we were updating, do it again
      if (this.pendingUpdate) {
        this.pendingUpdate = false;
        this.isUpdating = false;
        await this.updateWidgets();
      }
    } catch (error) {
      console.error("Widget update failed:", error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Debounced update - waits for a quiet period before updating
   * Useful for rapid successive data changes
   */
  async debouncedUpdate(delay: number = 300): Promise<void> {
    return new Promise((resolve) => {
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }

      this.updateTimeout = setTimeout(async () => {
        await this.updateWidgets();
        resolve();
      }, delay);
    });
  }
}

const updateQueue = new WidgetUpdateQueue();

class WidgetService {
  /**
   * Check if widgets are supported on current platform
   */
  async isSupported(): Promise<boolean> {
    if (Platform.OS !== "android") {
      return false;
    }

    try {
      return await WidgetModule.isWidgetSupported();
    } catch (error) {
      console.warn("Widget support check failed:", error);
      return false;
    }
  }

  /**
   * Update all active widgets
   * This triggers all widgets to reload with fresh data
   * Uses queue to prevent race conditions
   */
  async updateAllWidgets(): Promise<void> {
    if (Platform.OS !== "android") {
      return; // Silently skip on non-Android platforms
    }

    if (!isNativeModuleAvailable) {
      return; // Silently skip when native module not available (Expo Go)
    }

    try {
      await updateQueue.updateWidgets();
    } catch (error) {
      // Just log, don't throw - widgets are optional functionality
      console.warn("[WidgetService] Widget update failed:", error);
    }
  }

  /**
   * Debounced widget update for rapid successive changes
   * Waits for quiet period before updating to improve performance
   */
  async debouncedUpdate(delay: number = 300): Promise<void> {
    if (Platform.OS !== "android" || !isNativeModuleAvailable) {
      return;
    }

    try {
      await updateQueue.debouncedUpdate(delay);
    } catch (error) {
      console.warn("[WidgetService] Debounced update failed:", error);
    }
  }

  /**
   * Reload all widget instances
   * Forces widgets to refresh immediately
   * Uses queue to prevent race conditions
   */
  async reloadWidgets(): Promise<void> {
    if (Platform.OS !== "android" || !isNativeModuleAvailable) {
      return;
    }

    try {
      await updateQueue.updateWidgets();
    } catch (error) {
      console.warn("[WidgetService] Widget reload failed:", error);
    }
  }

  /**
   * Get widget data file path from native module
   */
  async getWidgetDataPath(): Promise<string | null> {
    if (Platform.OS !== "android" || !isNativeModuleAvailable) {
      return null;
    }

    try {
      return await WidgetModule.getWidgetDataPath();
    } catch (error) {
      console.warn("[WidgetService] Failed to get widget data path:", error);
      return null;
    }
  }

  /**
   * Write widget data using native module (direct file write)
   */
  async writeWidgetData(data: {
    spending: number;
    budget: number;
    currency: string;
    categories: Array<{ name: string; spending: number }>;
  }): Promise<void> {
    if (Platform.OS !== "android" || !isNativeModuleAvailable) {
      return;
    }

    try {
      await WidgetModule.writeWidgetData(data);
    } catch (error) {
      console.warn("[WidgetService] Failed to write widget data:", error);
    }
  }

  /**
   * Write test data to verify widget is working
   */
  async writeTestData(): Promise<void> {
    if (Platform.OS !== "android" || !isNativeModuleAvailable) {
      return;
    }

    try {
      await WidgetModule.writeTestData();
    } catch (error) {
      console.warn("[WidgetService] Failed to write test data:", error);
    }
  }
}

export const widgetService = new WidgetService();
export default widgetService;
