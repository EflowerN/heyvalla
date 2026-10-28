"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { LANG_COOKIE, translate, type Lang } from "@/lib/i18n";

const Context = createContext<{ lang: Lang; setLang: (lang: Lang) => void; t: (text: string) => string }>({ lang: "en", setLang: () => {}, t: text => text });

export function I18nProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`; } catch { /* cookies blocked: language still changes for this visit */ }
    document.documentElement.lang = next === "dv" ? "dv" : "en";
    document.documentElement.dir = next === "dv" ? "rtl" : "ltr";
  }, []);
  const value = useMemo(() => ({ lang, setLang, t: (text: string) => translate(lang, text) }), [lang, setLang]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useI18n = () => useContext(Context);
export const useT = () => useContext(Context).t;

/** For module-level callbacks (e.g. dynamic() loading states) that cannot call the hook directly. */
export function T({ k }: { k: string }) {
  return <>{useT()(k)}</>;
}
