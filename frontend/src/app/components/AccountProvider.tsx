"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AccountInfo } from "@/lib/account-types";

export type Account = AccountInfo | null;
const Context = createContext<{ account: Account; ready: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> }>({ account: null, ready: false, refresh: async () => {}, signOut: async () => {} });

export function AccountProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [account, setAccount] = useState<Account>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/account/me", { cache: "no-store" });
      const data = response.ok ? await response.json() : { account: null };
      setAccount(data.account ?? null);
    } catch { setAccount(null); } finally { setReady(true); }
  }, []);
  const signOut = useCallback(async () => {
    try { await fetch("/api/account/logout", { method: "POST" }); } catch { /* the cookie is replaced server-side; retry on the next click */ }
    setAccount(null);
    router.push("/");
    router.refresh();
  }, [router]);
  useEffect(() => {
    let live = true;
    fetch("/api/account/me", { cache: "no-store" }).then(response => response.ok ? response.json() : { account: null })
      .then(data => { if (live) { setAccount(data.account ?? null); setReady(true); } })
      .catch(() => { if (live) { setAccount(null); setReady(true); } });
    return () => { live = false; };
  }, []);
  const value = useMemo(() => ({ account, ready, refresh, signOut }), [account, ready, refresh, signOut]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useAccount = () => useContext(Context);
