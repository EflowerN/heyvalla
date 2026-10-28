"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "./AccountProvider";
import { useT } from "./I18nProvider";
import { ACCOUNT_TYPES, isAdmin, type AccountType } from "@/lib/account-types";

type Row = { id: number; name: string | null; email: string; type: AccountType; status: "active" | "pending" | "suspended"; is_admin: boolean; organization_name: string | null; phone: string | null; created_at: string; approved_at: string | null };
type Event = { id: number; action: string; target_email: string | null; admin_email: string | null; created_at: string };

export default function AdminUsers() {
  const t = useT();
  const { account, ready } = useAccount();
  const [users, setUsers] = useState<Row[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const allowed = ready && isAdmin(account);

  const load = useCallback(async (filters: { status: string; type: string; query: string }) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.type) params.set("type", filters.type);
    if (filters.query.trim()) params.set("q", filters.query.trim());
    try {
      const [list, audit] = await Promise.all([fetch(`/api/admin/users?${params}`, { cache: "no-store" }), fetch("/api/admin/audit", { cache: "no-store" })]);
      const data = await list.json();
      if (!list.ok) throw new Error(data.message || "Could not load accounts.");
      setUsers(data.users); setMessage("");
      if (audit.ok) setEvents((await audit.json()).events);
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : "Could not load accounts."); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const handle = setTimeout(() => { void load({ status, type, query }); }, query ? 250 : 0);
    return () => clearTimeout(handle);
  }, [allowed, load, status, type, query]);

  async function act(id: number, body: Record<string, string>) {
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.errors ? Object.values(data.errors as Record<string, string[]>).flat().join(" ") : data.message || "That did not work.");
      await load({ status, type, query });
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : "That did not work."); }
  }

  if (!ready) return <main className="mx-auto max-w-6xl px-5 py-16"><p role="status">{t("One moment…")}</p></main>;
  if (!allowed) return <main className="mx-auto max-w-2xl px-5 py-16"><h1 className="text-4xl">{t("Admin")}</h1><p className="mt-4 leading-7">{t("This page is for admins. Admins are added by the team from the command line, not from the website.")}</p></main>;
  const field = "mt-1 min-h-11 rounded-xl border border-ocean/15 bg-white px-3 text-sm";
  const pending = users.filter(user => user.status === "pending").length;
  return <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
    <h1 className="text-4xl">{t("Accounts")}</h1>
    <p className="mt-2 text-ocean/70">{pending ? `${pending} ${t("waiting for approval")}` : t("Nobody is waiting for approval.")}</p>
    <div className="mt-6 flex flex-wrap items-end gap-3">
      <label className="text-sm font-semibold">{t("Search")}<input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("Name, email or organisation")} className={`${field} block w-64`} /></label>
      <label className="text-sm font-semibold">{t("Status")}<select value={status} onChange={event => setStatus(event.target.value)} className={`${field} block`}><option value="">{t("All")}</option><option value="pending">{t("Waiting for approval")}</option><option value="active">{t("Active")}</option><option value="suspended">{t("Suspended")}</option></select></label>
      <label className="text-sm font-semibold">{t("Type")}<select value={type} onChange={event => setType(event.target.value)} className={`${field} block`}><option value="">{t("All")}</option>{ACCOUNT_TYPES.map(item => <option key={item.value} value={item.value}>{t(item.label)}</option>)}</select></label>
    </div>
    {message && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{t(message)}</p>}
    {loading ? <p role="status" className="mt-6">{t("One moment…")}</p> : <div className="mt-6 overflow-x-auto rounded-2xl border border-ocean/10 bg-white">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-sand text-xs uppercase tracking-wide text-ocean/70"><tr><th className="p-3">{t("Account")}</th><th className="p-3">{t("Type")}</th><th className="p-3">{t("Status")}</th><th className="p-3">{t("Actions")}</th></tr></thead>
        <tbody>{users.map(user => {
          const me = user.email === account?.email;
          return <tr key={user.id} className="border-t border-ocean/10 align-top">
            <td className="p-3"><b>{user.name || user.email}</b>{user.is_admin && <span className="pill ms-2 bg-ocean text-white">{t("Admin")}</span>}<div className="text-ocean/65">{user.email}</div>{user.organization_name && <div className="text-ocean/65">{user.organization_name}{user.phone ? ` · ${user.phone}` : ""}</div>}</td>
            <td className="p-3"><select aria-label={`${t("Type")}: ${user.email}`} value={user.type} onChange={event => void act(user.id, { action: "set_type", type: event.target.value })} className={field}>{ACCOUNT_TYPES.map(item => <option key={item.value} value={item.value}>{t(item.label)}</option>)}</select></td>
            <td className="p-3"><span className={`pill ${user.status === "active" ? "bg-emerald-100 text-emerald-800" : user.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-800"}`}>{t(user.status === "active" ? "Active" : user.status === "pending" ? "Waiting for approval" : "Suspended")}</span></td>
            <td className="p-3"><div className="flex flex-wrap gap-2">
              {user.status === "pending" && <button type="button" onClick={() => void act(user.id, { action: "approve" })} className="min-h-11 rounded-lg bg-lagoon px-3 text-sm font-semibold text-white">{t("Approve")}</button>}
              {user.status !== "suspended" && !me && <button type="button" onClick={() => void act(user.id, { action: "suspend" })} className="min-h-11 rounded-lg border border-rose-300 px-3 text-sm font-semibold text-rose-800">{t("Suspend")}</button>}
              {user.status === "suspended" && <button type="button" onClick={() => void act(user.id, { action: "reinstate" })} className="min-h-11 rounded-lg border border-ocean/20 px-3 text-sm font-semibold">{t("Reinstate")}</button>}
              {user.is_admin ? !me && <button type="button" onClick={() => void act(user.id, { action: "revoke_admin" })} className="min-h-11 rounded-lg border border-ocean/20 px-3 text-sm">{t("Remove admin")}</button> : user.status === "active" && <button type="button" onClick={() => void act(user.id, { action: "grant_admin" })} className="min-h-11 rounded-lg border border-ocean/20 px-3 text-sm">{t("Make admin")}</button>}
            </div></td>
          </tr>;
        })}{!users.length && <tr><td colSpan={4} className="p-6 text-center text-ocean/65">{t("No accounts match.")}</td></tr>}</tbody>
      </table>
    </div>}
    <section className="mt-10" aria-label={t("Recent changes")}>
      <h2 className="text-2xl">{t("Recent changes")}</h2>
      <ul className="mt-3 divide-y divide-ocean/10 rounded-2xl border border-ocean/10 bg-white text-sm">
        {events.slice(0, 15).map(event => <li key={event.id} className="flex flex-wrap justify-between gap-2 p-3"><span><b>{event.admin_email}</b> {event.action.replaceAll("_", " ")} <b>{event.target_email}</b></span><span className="text-ocean/60">{new Date(event.created_at.replace(" ", "T") + "Z").toLocaleString("en-GB", { timeZone: "Indian/Maldives", dateStyle: "medium", timeStyle: "short" })}</span></li>)}
        {!events.length && <li className="p-3 text-ocean/65">{t("Nothing yet.")}</li>}
      </ul>
    </section>
  </main>;
}
