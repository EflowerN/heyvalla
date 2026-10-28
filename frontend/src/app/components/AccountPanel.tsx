"use client";

import Link from "next/link";
import { useAccount } from "./AccountProvider";
import { useT } from "./I18nProvider";
import { ACCOUNT_TYPES, canUseBoatTools, isAdmin } from "@/lib/account-types";

export default function AccountPanel() {
  const t = useT();
  const { account, ready } = useAccount();
  if (!ready) return <main className="mx-auto max-w-2xl px-5 py-16"><p role="status">{t("One moment…")}</p></main>;
  if (!account) return <main className="mx-auto max-w-2xl px-5 py-16"><h1 className="text-4xl">{t("My account")}</h1><p className="mt-4">{t("Sign in to see your account.")}</p><Link href="/login" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-lagoon px-6 font-semibold text-white">{t("Sign in")}</Link></main>;
  const type = ACCOUNT_TYPES.find(item => item.value === account.type)!;
  const tone = account.status === "active" ? "bg-emerald-100 text-emerald-800" : account.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-800";
  const link = "inline-flex min-h-12 items-center rounded-xl bg-lagoon px-6 font-semibold text-white";
  return <main className="mx-auto max-w-2xl px-5 py-12 md:py-16">
    <h1 className="text-4xl">{t("My account")}</h1>
    <section className="card mt-7 p-6" aria-label={t("Account details")}>
      <p className="text-lg font-semibold">{account.name || account.email}</p>
      <p className="text-sm text-ocean/70">{account.email}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="pill bg-lagoon/10 text-ocean">{t(type.label)}</span>
        <span className={`pill ${tone}`}>{t(account.status === "active" ? "Active" : account.status === "pending" ? "Waiting for approval" : "Suspended")}</span>
        {account.is_admin && <span className="pill bg-ocean text-white">{t("Admin")}</span>}
      </div>
      {account.organization_name && <p className="mt-4 text-sm"><span className="text-ocean/60">{t("Organisation")}:</span> <b>{account.organization_name}</b></p>}
    </section>
    {account.status === "pending" && <p role="status" className="mt-6 rounded-xl bg-amber-50 p-4 leading-7">{t("Thanks for signing up. Our team checks every boat owner, vehicle owner and business before they go live. You will be able to use your tools here as soon as you are approved.")}</p>}
    {account.status === "suspended" && <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 leading-7">{t("This account is suspended. Contact support if you think this is a mistake.")}</p>}
    <div className="mt-8 flex flex-wrap gap-3">
      {account.status === "active" && account.type === "customer" && <Link href="/journeys" className={link}>{t("My trips")}</Link>}
      {canUseBoatTools(account) && <Link href="/providers" className={link}>{t("Open boat owner tools")}</Link>}
      {account.status === "active" && (account.type === "vehicle_owner" || account.type === "business") && <p className="rounded-xl bg-sea/5 p-4 leading-7">{t("Your account is approved. Tools for vehicle owners and businesses are coming soon; we will email you when they are ready.")}</p>}
      {isAdmin(account) && <Link href="/admin" className={link}>{t("Open admin")}</Link>}
    </div>
  </main>;
}
