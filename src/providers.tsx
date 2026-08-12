import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { setWindowChrome } from "./api/client";
import {
  LOCALE_STORAGE_KEY,
  readStoredLocale,
  translate,
  type AppLocale,
  type MessageKey,
  type MessageValues,
} from "./i18n";

export type ColorMode = "system" | "light" | "dark";

const COLOR_STORAGE_KEY = "tauri-starter-color-mode";

function isColorMode(value: string): value is ColorMode {
  return value === "system" || value === "light" || value === "dark";
}

function readStoredMode(): ColorMode {
  try {
    const stored = localStorage.getItem(COLOR_STORAGE_KEY);
    if (stored && isColorMode(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "system";
}

function resolveEffective(mode: ColorMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

const BG = {
  light: "#F1F4F7",
  dark: "#111112",
} as const;

function applyDocumentScheme(effective: "light" | "dark") {
  const bg = BG[effective];
  document.documentElement.style.colorScheme = effective;
  document.documentElement.style.backgroundColor = bg;
  document.documentElement.style.setProperty("--app-shell-bg", bg);
  document.documentElement.dataset.colorMode = effective;
  document.body.style.backgroundColor = bg;
  const root = document.getElementById("root");
  if (root) root.style.backgroundColor = bg;
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.setAttribute("content", effective);
  }
}

type ColorModeContextValue = {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error("useColorMode must be used within Providers");
  }
  return ctx;
}

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: MessageKey, values?: MessageValues) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within Providers");
  }
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(() => readStoredMode());
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale());

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, values?: MessageValues) =>
      translate(locale, key, values),
    [locale],
  );

  useEffect(() => {
    const sync = () => {
      const effective = resolveEffective(mode);
      applyDocumentScheme(effective);
      void setWindowChrome(mode, effective).catch(() => {
        /* browser / api:dev without desktop shell */
      });
    };

    sync();

    if (mode !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => sync();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, "app.title");
  }, [locale]);

  const colorValue = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  const localeValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={localeValue}>
      <InternationalizationProvider locale={locale}>
        <ColorModeContext.Provider value={colorValue}>
          <Theme theme={neutralTheme} mode={mode}>
            {children}
          </Theme>
        </ColorModeContext.Provider>
      </InternationalizationProvider>
    </LocaleContext.Provider>
  );
}
