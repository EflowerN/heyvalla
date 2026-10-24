import type { Metadata } from "next";
import "./globals.css";
import TopBar from "./components/TopBar";

export const metadata: Metadata = {
  title: "HeyValla | Airport ferry connections",
  description: "A Thaa Atoll ferry-to-airport planning demonstration.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><TopBar />{children}</body></html>;
}
