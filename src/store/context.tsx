import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { resolveAdapters, type Adapters } from "@/services/adapters";
import { messages } from "@/i18n";
import { createSeedState } from "./seed";
import { loadState, saveState } from "./persist";
import type { AppState } from "./types";

type Store = {
  state: AppState;
  commit: (next: AppState) => void;
  adapters: Adapters;
  reset: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const adapters = useMemo(() => resolveAdapters(import.meta.env), []);

  useEffect(() => {
    let live = true;
    loadState().then((next) => {
      if (live) setState(next);
    });
    return () => {
      live = false;
    };
  }, []);

  const commit = useCallback((next: AppState) => {
    saveState(next);
    setState(next);
  }, []);

  const reset = useCallback(async () => {
    const locale = state?.locale ?? "en";
    const next = await createSeedState(new Date(), locale);
    saveState(next);
    setState(next);
  }, [state?.locale]);

  if (!state) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="font-heading text-4xl text-primary">Carpool Mauritius</p>
          <p className="mt-2 text-sm text-muted-foreground">Loading the demo…</p>
        </div>
      </div>
    );
  }

  return <Ctx.Provider value={{ state, commit, adapters, reset }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Store missing");
  return value;
}

export function useT() {
  const { state } = useApp();
  return messages[state.locale];
}
