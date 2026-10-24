"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const items = [
  { href: "/", label: "Planner" },
  { href: "/journeys", label: "My itineraries" },
  { href: "/sailings", label: "Sailings" },
  { href: "/greater-male-taxi", label: "Taxi fares" },
  { href: "/buses", label: "RTL buses" },
  { href: "/providers", label: "Boat owners" },
];

export default function TopBar() {
  const pathname = usePathname();
  const activeIndex = Math.max(0, items.findIndex(item => item.href === "/" ? pathname === "/" : (pathname.startsWith(item.href))));
  const nav = useRef<HTMLElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const link = links.current[activeIndex];
      if (link) setBox({ left: link.offsetLeft, width: link.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (nav.current) observer.observe(nav.current);
    return () => observer.disconnect();
  }, [activeIndex]);

  // Only start sliding after the first position is set, so the pill does not fly in on load.
  useEffect(() => { const id = requestAnimationFrame(() => setAnimate(true)); return () => cancelAnimationFrame(id); }, []);

  return (
    <header className="mx-auto max-w-6xl px-5 pt-8 sm:px-8 sm:pt-10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ocean/15 pb-5">
        <Link href="/" aria-label="Dhathuru App home" className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lagoon sm:h-28 sm:w-28">
          <Image src="/dhathuru-app-logo-transparent.png" alt="Dhathuru App" width={1254} height={1254} preload className="h-full w-full scale-[1.2] object-contain" sizes="135px" />
        </Link>
        <span className="rounded-full bg-lagoon/10 px-3 py-1 text-xs font-semibold text-ocean sm:order-last">Maldives · Demo</span>
        <nav ref={nav} aria-label="Sections" className="relative flex w-full overflow-x-auto rounded-full border border-ocean/15 bg-white p-1 shadow-sm sm:w-auto">
          <span
            aria-hidden="true"
            className={`absolute bottom-1 top-1 rounded-full bg-lagoon ${animate ? "transition-[left,width] duration-300 ease-out" : ""}`}
            style={{ left: box?.left ?? 0, width: box?.width ?? 0, opacity: box ? 1 : 0 }}
          />
          {items.map((item, index) => {
            const active = index === activeIndex;
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={element => { links.current[index] = element; }}
                aria-current={active ? "page" : undefined}
                className={`relative z-10 inline-flex min-h-10 shrink-0 flex-1 items-center justify-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors duration-300 sm:flex-none sm:px-5 ${active ? "text-white" : "text-ocean hover:text-lagoon"} ${active && !box ? "bg-lagoon" : ""}`}
              >{item.label}</Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
