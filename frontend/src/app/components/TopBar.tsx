"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LanguageToggle from "./LanguageToggle";
import { useAccount } from "./AccountProvider";
import { useT } from "./I18nProvider";
import { activeNavIndex, navItems } from "./nav-items";
import { isAdmin } from "@/lib/account-types";

const desktopLinks = [...navItems.slice(0, 5), { href: "/help", label: "Help" }] as const;

export default function TopBar() {
  const t = useT();
  const pathname = usePathname();
  const active = activeNavIndex(pathname);
  const { account, ready, signOut } = useAccount();
  const link = (current: boolean) => `relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-1 text-[15px] font-medium transition-colors ${current ? "text-lagoon after:absolute after:inset-x-0 after:bottom-1 after:h-0.5 after:rounded-full after:bg-lagoon" : "text-ocean/85 hover:text-lagoon"}`;
  return (
    <header className="sticky top-0 z-[1100] border-b border-ocean/10 bg-white/80 backdrop-blur-xl md:bg-[#FBF7EF]/90">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-8 md:gap-6 md:py-2.5">
        <Link href="/" aria-label={t("Dhathuru App home")} className="flex shrink-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lagoon">
          <span className="relative block h-14 w-14 overflow-hidden rounded-xl md:h-11 md:w-11">
            <Image src="/dhathuru-app-logo-transparent.png" alt="" width={1254} height={1254} preload className="h-full w-full scale-[1.25] object-contain" sizes="56px" />
          </span>
          <span className="font-display hidden text-[1.7rem] font-medium leading-none tracking-tight text-ocean md:inline">Dhathuru</span>
        </Link>
        <span className="rounded-full bg-lagoon/10 px-3 py-1 text-xs font-semibold text-ocean md:hidden">{t("Maldives · Demo")}</span>
        <nav aria-label={t("Sections")} className="hidden items-center gap-4 lg:gap-6 md:flex">
          {desktopLinks.map((item, index) => {
            const current = item.href === "/help" ? pathname === "/help" : index === active;
            return <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={link(current)}>{t(item.label)}</Link>;
          })}
        </nav>
        <div className="ms-auto flex items-center gap-2 md:gap-4">
          <LanguageToggle />
          <Link href="/providers" className="hidden min-h-11 items-center whitespace-nowrap text-sm font-medium text-ocean/75 hover:text-lagoon xl:inline-flex">{t("Boat owners")}</Link>
          {ready && account ? <>
            {isAdmin(account) && <Link href="/admin" className="hidden min-h-11 items-center whitespace-nowrap text-sm font-semibold text-lagoon md:inline-flex">{t("Admin")}</Link>}
            <Link href="/account" className="hidden max-w-40 items-center gap-2 truncate text-sm font-semibold hover:text-lagoon md:inline-flex" title={account.email}>{account.status === "pending" && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />}{account.name || account.email}</Link>
            <button type="button" onClick={() => void signOut()} className="hidden min-h-11 rounded-full border border-ocean/20 px-4 text-sm font-semibold hover:border-lagoon hover:text-lagoon md:inline-flex md:items-center">{t("Sign out")}</button>
          </> : ready ? <>
            <Link href="/login" className="hidden min-h-11 items-center whitespace-nowrap text-[15px] font-medium hover:text-lagoon md:inline-flex">{t("Sign in")}</Link>
            <Link href="/signup" className="hidden min-h-11 items-center whitespace-nowrap rounded-full bg-lagoon px-5 text-[15px] font-semibold text-white shadow-sm md:inline-flex">{t("Create account")}</Link>
          </> : null}
          {/* Phones keep the compact header: one account button instead of the desktop links. */}
          <Link href={ready && account ? "/account" : "/login"} aria-label={ready && account ? t("My account") : t("Sign in")} className="tap grid place-items-center rounded-full border border-ocean/15 bg-white text-ocean shadow-sm md:hidden">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
