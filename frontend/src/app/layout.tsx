import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import SiteFooter from "./components/SiteFooter";
import { AccountProvider } from "./components/AccountProvider";
import { I18nProvider } from "./components/I18nProvider";
import { LANG_COOKIE, parseLang } from "@/lib/i18n";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Dhathuru: island to island, door to door", template: "%s | Dhathuru App" },
  description: "Ferry, taxi, flight and taxi again, planned together across the Maldives. A working demo: no real tickets or payments.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = parseLang((await cookies()).get(LANG_COOKIE)?.value);
  return <html lang={lang} dir={lang === "dv" ? "rtl" : "ltr"} className={`${display.variable} ${body.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
    <body className="pb-24 md:pb-0"><I18nProvider initial={lang}><AccountProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to main content</a>
      <TopBar /><div id="main">{children}</div><SiteFooter /><BottomNav />
    </AccountProvider></I18nProvider></body>
  </html>;
}
