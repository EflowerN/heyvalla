"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAccount } from "./AccountProvider";
import { useT } from "./I18nProvider";
import { ACCOUNT_TYPES, nextPage, type AccountInfo, type AccountType } from "@/lib/account-types";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useT();
  const router = useRouter();
  const { refresh } = useAccount();
  const signup = mode === "signup";
  const [type, setType] = useState<AccountType>("customer");
  const [name, setName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tooShort = signup && password.length > 0 && password.length < 10;
  const chosen = ACCOUNT_TYPES.find(item => item.value === type)!;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (tooShort) { setError("Use at least 10 characters for your password."); return; }
    setBusy(true); setError("");
    try {
      const body = signup ? { name: name.trim() || null, email, password, type, ...(type !== "customer" ? { organization_name: organisation.trim(), phone: phone.trim() || null } : {}) } : { email, password };
      const response = await fetch(`/api/account/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.errors ? Object.values(data.errors as Record<string, string[]>).flat().join(" ") : data.message || "Something went wrong. Please try again.");
      await refresh();
      router.push(nextPage(data.account as AccountInfo));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Something went wrong. Please try again."); } finally { setBusy(false); }
  }
  const input = "mt-2 block min-h-12 w-full rounded-xl border border-ocean/15 bg-white px-4 text-base";
  return <main className="mx-auto max-w-lg px-5 py-12 md:py-20">
    <h1 className="text-4xl">{t(signup ? "Create your account" : "Welcome back")}</h1>
    <p className="mt-3 leading-7 text-ocean/75">{t(signup ? "One account for every ferry, flight and taxi. Your trips follow you to any device." : "Sign in to see your trips on this device.")}</p>
    <form onSubmit={submit} className="card mt-7 p-6" noValidate>
      {signup && <fieldset className="mb-5">
        <legend className="text-sm font-semibold">{t("I am a")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ACCOUNT_TYPES.map(item => <label key={item.value} className={`flex cursor-pointer gap-2 rounded-xl border p-3 text-sm ${type === item.value ? "border-lagoon bg-lagoon/5" : "border-ocean/15 bg-white"}`}>
            <input type="radio" name="account-type" value={item.value} checked={type === item.value} onChange={() => setType(item.value)} className="mt-1" />
            <span><b className="block">{t(item.label)}</b></span>
          </label>)}
        </div>
        <p className="mt-2 text-sm leading-6 text-ocean/70" role="status">{t(chosen.blurb)}</p>
      </fieldset>}
      {signup && <label className="block text-sm font-semibold">{t("Your name")} <span className="font-normal text-ocean/60">({t("optional")})</span><input value={name} onChange={event => setName(event.target.value)} autoComplete="name" maxLength={100} className={input} /></label>}
      {signup && chosen.organisation && <>
        <label className="mt-4 block text-sm font-semibold">{t(chosen.organisation)}<input required value={organisation} onChange={event => setOrganisation(event.target.value)} maxLength={100} className={input} /></label>
        <label className="mt-4 block text-sm font-semibold">{t("Phone")} <span className="font-normal text-ocean/60">({t("optional")})</span><input type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" maxLength={40} className={input} /></label>
      </>}
      <label className={`block text-sm font-semibold ${signup ? "mt-4" : ""}`}>{t("Email")}<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={255} className={input} /></label>
      <label className="mt-4 block text-sm font-semibold">{t(signup ? "New password" : "Password")}<input type={show ? "text" : "password"} required value={password} onChange={event => setPassword(event.target.value)} autoComplete={signup ? "new-password" : "current-password"} maxLength={128} aria-invalid={tooShort} aria-describedby="pw-hint" className={input} /></label>
      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
        <p id="pw-hint" className={tooShort ? "text-rose-700" : "text-ocean/65"}>{signup ? t("At least 10 characters. A few random words make a strong password.") : ""}</p>
        <label className="flex min-h-11 shrink-0 items-center gap-2"><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)} />{t("Show password")}</label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{t(error)}</p>}
      <button disabled={busy} className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-lagoon text-lg font-semibold text-white disabled:opacity-60">{busy ? t("One moment…") : t(signup ? "Create account" : "Sign in")}</button>
      <p className="mt-5 text-center text-sm">{t(signup ? "Already have an account?" : "New to Dhathuru?")} <Link className="font-semibold text-lagoon underline" href={signup ? "/login" : "/signup"}>{t(signup ? "Sign in" : "Create account")}</Link></p>
    </form>
    <p className="mt-4 text-xs leading-6 text-ocean/60">{t("This is a working demo. Use sample details; never reuse a password from another service.")}</p>
  </main>;
}
