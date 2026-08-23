"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, isLocaleCode, type LocaleCode } from "./locales";

const STORAGE_KEY = "azhl-locale";

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * App-wide selected-language state, persisted to localStorage and reflected onto
 * `<html lang>`. This is the seam a future translation/dictionary system plugs into — reading
 * `locale` from `useLocale()` — without any change to how the selector itself works.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isLocaleCode(stored)) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale: setLocaleState }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
