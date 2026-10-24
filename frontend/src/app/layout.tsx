import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeyValla | Airport ferry connections",
  description: "A Thaa Atoll ferry-to-airport planning demonstration.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
