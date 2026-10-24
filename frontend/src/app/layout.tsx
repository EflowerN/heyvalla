import type { Metadata } from "next";
import "./globals.css";
import TopBar from "./components/TopBar";

export const metadata: Metadata = {
  title: "Dhathuru App | Your whole journey",
  description: "Plan ferry, airport transfer, flight and onward taxi connections in one Maldives journey preview.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><TopBar />{children}</body></html>;
}
