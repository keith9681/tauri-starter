import { en } from "./messages/en";
import { zhCN } from "./messages/zh-CN";
import type {
  AppLocale,
  MessageCatalog,
  MessageKey,
  MessageValues,
} from "./types";

export type { AppLocale, MessageKey, MessageValues } from "./types";

export const LOCALE_STORAGE_KEY = "tauri-starter-locale";

export const DEFAULT_LOCALE: AppLocale = "zh-CN";

export const catalogs: Record<AppLocale, MessageCatalog> = {
  "zh-CN": zhCN,
  en,
};

export function isAppLocale(value: string): value is AppLocale {
  return value === "zh-CN" || value === "en";
}

export function readStoredLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isAppLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

/** Replace `{name}` placeholders; missing keys stay as `{name}`. */
export function formatMessage(
  template: string,
  values?: MessageValues,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export function translate(
  locale: AppLocale,
  key: MessageKey,
  values?: MessageValues,
): string {
  const catalog = catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
  const template = catalog[key] ?? catalogs[DEFAULT_LOCALE][key] ?? key;
  return formatMessage(template, values);
}
