import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import { I18nProvider } from "./components/I18nProvider";
import { LANG_COOKIE, parseLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { default: "Journey planner | Dhathuru App", template: "%s | Dhathuru App" },
  description: "Plan ferry, airport transfer, flight and onward taxi connections in one Maldives journey preview.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = parseLang((await cookies()).get(LANG_COOKIE)?.value);
  return <html lang={lang} dir={lang === "dv" ? "rtl" : "ltr"} data-scroll-behavior="smooth" suppressHydrationWarning>
    <body className="pb-24 md:pb-0"><I18nProvider initial={lang}><TopBar />{children}<BottomNav /></I18nProvider></body>
  </html>;
}
