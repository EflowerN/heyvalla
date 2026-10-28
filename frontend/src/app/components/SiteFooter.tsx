"use client";

import Link from "next/link";
import { useT } from "./I18nProvider";

export default function SiteFooter() {
  const t = useT();
  return <footer className="mt-16 border-t border-ocean/10 bg-white/60">
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.2fr_1fr_1fr]">
      <div>
        <p className="font-display text-2xl font-medium">Dhathuru</p>
        <p className="mt-1 text-sm font-medium text-lagoon">{t("Every island, one journey.")}</p>
        <p className="mt-3 max-w-xs text-sm leading-6 text-ocean/70">{t("Sea routes on maps are illustrative, never for navigation. Estimated fares may change. All times are Maldives time (UTC+5).")}</p>
      </div>
      <nav aria-label={t("Good to know")}>
        <p className="text-sm font-semibold">{t("Good to know")}</p>
        <ul className="mt-3 space-y-1 text-sm">
          <li><Link href="/help" className="inline-flex min-h-11 items-center text-ocean/80 hover:text-lagoon">{t("Help and questions")}</Link></li>
          <li><Link href="/legal/terms" className="inline-flex min-h-11 items-center text-ocean/80 hover:text-lagoon">{t("Terms of use")}</Link></li>
          <li><Link href="/legal/privacy" className="inline-flex min-h-11 items-center text-ocean/80 hover:text-lagoon">{t("Privacy")}</Link></li>
        </ul>
      </nav>
      <nav aria-label={t("Explore")}>
        <p className="text-sm font-semibold">{t("Explore")}</p>
        <ul className="mt-3 space-y-1 text-sm">
          <li><Link href="/sailings" className="inline-flex min-h-11 items-center text-ocean/80 hover:text-lagoon">{t("Sailings")}</Link></li>
          <li><Link href="/providers" className="inline-flex min-h-11 items-center text-ocean/80 hover:text-lagoon">{t("Boat owners")}</Link></li>
          <li><Link href="/ferry-planner" className="inline-flex min-h-11 items-center text-ocean/80 hover:text-lagoon">{t("Only need a ferry to the airport?")}</Link></li>
        </ul>
      </nav>
    </div>
    <p className="border-t border-ocean/10 px-5 py-4 text-center text-xs text-ocean/60">© 2026 Dhathuru · {t("A working demo. No real tickets or payments.")}</p>
  </footer>;
}
