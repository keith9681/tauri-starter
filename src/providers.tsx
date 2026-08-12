import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { setWindowChrome } from "./api/client";

export type ColorMode = "system" | "light" | "dark";

const STORAGE_KEY = "tauri-starter-color-mode";

function isColorMode(value: string): value is ColorMode {
  return value === "system" || value === "light" || value === "dark";
}

function readStoredMode(): ColorMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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

export function Providers({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(() => readStoredMode());

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

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

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <ColorModeContext.Provider value={value}>
      <Theme theme={neutralTheme} mode={mode}>
        {children}
      </Theme>
    </ColorModeContext.Provider>
  );
}
