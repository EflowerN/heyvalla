"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import LocationSearch from "./LocationSearch";
import { useT } from "./I18nProvider";
import type { Directory, Place } from "@/lib/journey-plan";
import { maldivesDate } from "@/lib/travel-date";
import { CAUTION, MODES, tripSearchParams, type Caution, type TravelMode, type When } from "@/lib/trip-preferences";

const empty: Directory = { islands: [], airports: [] };
const control = "mt-2 block min-h-12 w-full rounded-xl border border-ocean/15 bg-white px-4 text-base";

export default function TripSearchForm() {
  const t = useT();
  const router = useRouter();
  const ids = useId();
  const [directory, setDirectory] = useState<Directory>(empty);
  const [directoryError, setDirectoryError] = useState("");
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [date, setDate] = useState(() => maldivesDate(Date.now() + 86400000));
  const [time, setTime] = useState("09:00");
  const [passengers, setPassengers] = useState(1);
  const [when, setWhen] = useState<When>("leave");
  const [budget, setBudget] = useState("");
  const [changes, setChanges] = useState("");
  const [modes, setModes] = useState<TravelMode[]>([]);
  const [caution, setCaution] = useState<Caution>("balanced");
  const [error, setError] = useState("");
  const places = [...directory.islands, ...directory.airports];

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/islands", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Location data could not load. Please refresh and try again.");
      setDirectory(await response.json());
    }).catch(failure => { if (!controller.signal.aborted) setDirectoryError(failure.message); });
    return () => controller.abort();
  }, []);

  function swap() {
    setFrom(to); setTo(from); setFromText(toText); setToText(fromText);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!from || !to) { setError("Choose both places from the suggestions."); return; }
    if (from.id === to.id) { setError("Choose two different places."); return; }
    if (!date || date < maldivesDate()) { setError("Choose today or a later date."); return; }
    setError("");
    const budgetMvr = Number(budget);
    router.push(`/plan?${tripSearchParams({ from: from.id, to: to.id, date, time, passengers, when, caution, modes, budgetMvr: Number.isFinite(budgetMvr) && budgetMvr > 0 ? Math.round(budgetMvr) : null, maxChanges: changes === "" ? null : Number(changes) }).toString()}`);
  }
  const toggleMode = (mode: TravelMode) => setModes(current => current.includes(mode) ? current.filter(item => item !== mode) : [...current, mode]);

  return <form onSubmit={submit} aria-label={t("Trip search")} className="rounded-[1.75rem] bg-white p-5 text-ocean shadow-[0_20px_50px_-20px_rgba(13,43,51,0.45)] sm:p-7">
    <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-3">
      <LocationSearch id={`${ids}-from`} label={t("From")} places={places} value={fromText} selected={from} disabled={!places.length} onChange={value => { setFromText(value); setFrom(null); }} onSelect={place => { setFrom(place); setFromText(place.name); }} />
      <button type="button" onClick={swap} aria-label={t("Swap from and to")} className="tap mx-auto grid h-12 w-12 place-items-center rounded-full border border-ocean/15 bg-white text-lagoon shadow-sm md:mt-9">
        <svg className="h-5 w-5 rotate-90 md:rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4" /></svg>
      </button>
      <LocationSearch id={`${ids}-to`} label={t("To")} places={places} value={toText} selected={to} disabled={!places.length} onChange={value => { setToText(value); setTo(null); }} onSelect={place => { setTo(place); setToText(place.name); }} />
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-semibold">{t("Date")}<input type="date" required min={maldivesDate()} value={date} onChange={event => setDate(event.target.value)} className={control} /></label>
      <label className="text-sm font-semibold">{t("Time")}<input type="time" required value={time} onChange={event => setTime(event.target.value)} className={control} /></label>
      <label className="text-sm font-semibold">{t("Travellers")}<select value={passengers} onChange={event => setPassengers(Number(event.target.value))} className={control}>{[1, 2, 3, 4, 5, 6].map(count => <option key={count} value={count}>{count} {t(count === 1 ? "traveller" : "travellers")}</option>)}</select></label>
    </div>
    <div role="group" aria-label={t("Time applies to")} className="mt-4 grid grid-cols-2 rounded-xl bg-[#F3EBDD] p-1 text-sm font-semibold">
      {(["leave", "arrive"] as const).map(option => <button key={option} type="button" aria-pressed={when === option} onClick={() => setWhen(option)} className={`min-h-11 rounded-lg px-3 transition ${when === option ? "bg-white text-ocean shadow-sm" : "text-ocean/65"}`}>{t(option === "leave" ? "Leave after" : "Arrive by")}</button>)}
    </div>
    <details className="mt-4 border-t border-ocean/10 pt-2">
      <summary className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-lagoon">{t("Preferences")}</summary>
      <p className="mt-1 text-sm text-ocean/70">{t("Defaults suit most journeys.")}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">{t("Most changes")}<select value={changes} onChange={event => setChanges(event.target.value)} className={control}><option value="">{t("Any number")}</option><option value="0">{t("Direct only")}</option><option value="1">{t("Up to 1 change")}</option><option value="2">{t("Up to 2 changes")}</option></select></label>
        <label className="text-sm font-semibold">{t("Budget (MVR, whole trip)")}<input type="number" inputMode="numeric" min={1} max={1000000} placeholder={t("No limit")} value={budget} onChange={event => setBudget(event.target.value)} className={control} /></label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">{t("Ways to travel")}</legend>
        <p className="text-xs text-ocean/65">{t("Leave all unticked to allow every option.")}</p>
        <div className="mt-2 flex flex-wrap gap-2">{MODES.map(mode => <label key={mode.value} className="wipe tap flex items-center gap-2 rounded-full border border-ocean/15 bg-white px-4 text-sm"><input type="checkbox" checked={modes.includes(mode.value)} onChange={() => toggleMode(mode.value)} />{t(mode.label)}</label>)}</div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">{t("Buffer setting")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">{(Object.keys(CAUTION) as Caution[]).map(level => <label key={level} className={`flex cursor-pointer gap-2 rounded-xl border p-3 text-sm ${caution === level ? "border-lagoon bg-lagoon/5" : "border-ocean/15 bg-white"}`}><input type="radio" name={`${ids}-caution`} checked={caution === level} onChange={() => setCaution(level)} className="mt-1" /><span><b className="block">{t(CAUTION[level].label)}</b><span className="text-xs text-ocean/70">{t(CAUTION[level].hint)}</span></span></label>)}</div>
      </fieldset>
    </details>
    {(error || directoryError) && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{t(error || directoryError)}</p>}
    <button className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-lagoon text-lg font-semibold text-white disabled:opacity-60" disabled={!places.length && !directoryError}>
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>{t("Search trips")}
    </button>
  </form>;
}
