"use client";

import { useI18n } from "./I18nProvider";

export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  const next = lang === "dv" ? "en" : "dv";
  return <button type="button" onClick={() => setLang(next)} aria-label={t("Switch language")} lang={next} className="tap inline-flex items-center gap-2 rounded-full border border-ocean/15 bg-white px-3 text-sm font-semibold text-ocean shadow-sm hover:border-lagoon hover:text-lagoon">
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
    <span>{next === "dv" ? "ދިވެހި" : "English"}</span>
  </button>;
}
