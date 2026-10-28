"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "./NavIcons";
import { useT } from "./I18nProvider";
import { activeNavIndex, navItems } from "./nav-items";

export default function BottomNav() {
  const t = useT();
  const active = activeNavIndex(usePathname());
  return <nav aria-label={t("Sections")} className="fixed inset-x-0 bottom-0 z-[1000] border-t border-ocean/10 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
    <ul className="mx-auto flex max-w-lg px-1">
      {navItems.map((item, index) => {
        const on = index === active;
        return <li key={item.href} className="flex-1">
          <Link href={item.href} aria-current={on ? "page" : undefined} className={`relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold ${on ? "text-lagoon" : "text-ocean/60"}`}>
            {on && <span aria-hidden="true" className="absolute top-0 h-1 w-6 rounded-b-md bg-lagoon" />}
            <NavIcon name={item.icon} className={`h-[22px] w-[22px] transition-transform duration-300 ${on ? "-translate-y-0.5 scale-110" : ""}`} />
            <span>{t(item.short)}</span>
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}
