import type { Metadata } from "next";
import AdminUsers from "../components/AdminUsers";

export const metadata: Metadata = { title: "Admin" };
export default function AdminPage() { return <AdminUsers />; }
