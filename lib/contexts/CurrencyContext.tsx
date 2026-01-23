import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Currency,
  getCurrency,
  DEFAULT_CURRENCY_CODE,
  CURRENCIES,
} from "../currencies";

const STORAGE_KEY = "@budget_app_currency";

interface CurrencyContextType {
  // Default currency for new transactions
  defaultCurrency: Currency;
  defaultCurrencyCode: string;

  // Actions
  setDefaultCurrency: (code: string) => Promise<void>;

  // Helpers
  getCurrencyByCode: (code: string) => Currency | undefined;
  allCurrencies: Currency[];

  // Loading state
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState<string>(
    DEFAULT_CURRENCY_CODE,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load saved currency on mount
  useEffect(() => {
    loadSavedCurrency();
  }, []);

  const loadSavedCurrency = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Validate it's a real currency
        const currency = getCurrency(saved);
        if (currency) {
          setDefaultCurrencyCode(saved);
        }
      }
    } catch (error) {
      console.error("Error loading saved currency:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setDefaultCurrency = useCallback(async (code: string) => {
    const currency = getCurrency(code);
    if (!currency) {
      console.warn(`Invalid currency code: ${code}`);
      return;
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, code);
      setDefaultCurrencyCode(code);
    } catch (error) {
      console.error("Error saving currency:", error);
    }
  }, []);

  const getCurrencyByCode = useCallback((code: string) => {
    return getCurrency(code);
  }, []);

  const defaultCurrency =
    getCurrency(defaultCurrencyCode) || getCurrency(DEFAULT_CURRENCY_CODE)!;

  return (
    <CurrencyContext.Provider
      value={{
        defaultCurrency,
        defaultCurrencyCode,
        setDefaultCurrency,
        getCurrencyByCode,
        allCurrencies: CURRENCIES,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
