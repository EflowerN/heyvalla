import type { Metadata } from "next";
import AccountPanel from "../components/AccountPanel";

export const metadata: Metadata = { title: "My account" };
export default function AccountPage() { return <AccountPanel />; }
