/**
 * Native Widget Service
 * Bridge between React Native and native Android widgets
 */

import { NativeModules, Platform } from 'react-native';
import { WidgetDataProvider } from './WidgetDataProvider';

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

const LINKING_ERROR =
  `The package 'BudgetWidgetModule' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ 
    android: '- You have rebuilt the app after installing the package\n',
    default: '' 
  }) +
  '- You are not using Expo Go\n' +
  '- You have run the build command\n';

// Native module will be implemented in Android native code
const WidgetModule: WidgetNativeModule = NativeModules.BudgetWidgetModule
  ? NativeModules.BudgetWidgetModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

class WidgetService {
  /**
   * Check if widgets are supported on current platform
   */
  async isSupported(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      return await WidgetModule.isWidgetSupported();
    } catch (error) {
      console.warn('Widget support check failed:', error);
      return false;
    }
  }

  /**
   * Update all active widgets
   * This triggers all widgets to reload with fresh data
   */
  async updateAllWidgets(): Promise<void> {
    if (Platform.OS !== 'android') {
      console.warn('Widgets are only supported on Android');
      return;
    }

    try {
      // Write the latest data using native module (which also triggers update)
      await WidgetDataProvider.writeWidgetData();
      console.log('Widgets updated successfully');
    } catch (error) {
      console.error('Failed to update widgets:', error);
      throw error;
    }
  }

  /**
   * Reload all widget instances
   * Forces widgets to refresh immediately
   */
  async reloadWidgets(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // Write fresh data (which triggers update automatically)
      await WidgetDataProvider.writeWidgetData();
      console.log('Widget instances reloaded');
    } catch (error) {
      console.error('Failed to reload widgets:', error);
      throw error;
    }
  }

  /**
   * Get widget data file path from native module
   */
  async getWidgetDataPath(): Promise<string | null> {
    if (Platform.OS !== 'android') {
      return null;
    }

    try {
      return await WidgetModule.getWidgetDataPath();
    } catch (error) {
      console.error('Failed to get widget data path:', error);
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
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const path = await WidgetModule.writeWidgetData(data);
      console.log('Widget data written successfully to:', path);
      console.log('Widget data:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to write widget data:', error);
      throw error;
    }
  }

  /**
   * Write test data to verify widget is working
   */
  async writeTestData(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const result = await WidgetModule.writeTestData();
      console.log('Test data written:', result);
    } catch (error) {
      console.error('Failed to write test data:', error);
      throw error;
    }
  }
}

export const widgetService = new WidgetService();
export default widgetService;
