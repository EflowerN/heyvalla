"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import LanguageToggle from "./LanguageToggle";
import { useT } from "./I18nProvider";
import { activeNavIndex, navItems } from "./nav-items";

export default function TopBar() {
  const t = useT();
  const activeIndex = activeNavIndex(usePathname());
  const nav = useRef<HTMLElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const link = links.current[activeIndex];
      if (link) setBox({ left: link.offsetLeft, top: link.offsetTop, width: link.offsetWidth, height: link.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (nav.current) observer.observe(nav.current);
    return () => observer.disconnect();
  }, [activeIndex]);

  // Only start sliding after the first position is set, so the pill does not fly in on load.
  useEffect(() => { const id = requestAnimationFrame(() => setAnimate(true)); return () => cancelAnimationFrame(id); }, []);

  return (
    <header className="sticky top-0 z-[1100] border-b border-ocean/10 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-8">
        <Link href="/" aria-label={t("Dhathuru App home")} className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lagoon">
          <Image src="/dhathuru-app-logo-transparent.png" alt="Dhathuru App" width={1254} height={1254} preload className="h-full w-full scale-[1.25] object-contain" sizes="56px" />
        </Link>
        <span className="rounded-full bg-lagoon/10 px-3 py-1 text-xs font-semibold text-ocean">{t("Maldives · Demo")}</span>
        <nav ref={nav} aria-label={t("Sections")} className="relative ms-auto hidden rounded-full border border-ocean/10 bg-sand p-1 md:flex">
          <span aria-hidden="true" className={`absolute rounded-full bg-lagoon shadow-sm ${animate ? "transition-[left,width] duration-300 ease-out" : ""}`} style={{ left: box?.left ?? 0, top: box?.top ?? 0, width: box?.width ?? 0, height: box?.height ?? 0, opacity: box ? 1 : 0 }} />
          {navItems.map((item, index) => {
            const active = index === activeIndex;
            return <Link key={item.href} href={item.href} ref={element => { links.current[index] = element; }} aria-current={active ? "page" : undefined}
              className={`relative z-10 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-300 ${active ? "text-white" : "text-ocean hover:text-lagoon"} ${active && !box ? "bg-lagoon" : ""}`}>{t(item.label)}</Link>;
          })}
        </nav>
        <div className="ms-auto md:ms-2"><LanguageToggle /></div>
      </div>
    </header>
  );
}
