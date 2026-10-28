"use client";

import Link from "next/link";
import NavIcon from "./NavIcons";
import { useT } from "./I18nProvider";
import { bullets, exampleLegs, honest, modes, steps } from "@/lib/site-copy";

export default function LandingSections() {
  const t = useT();
  return <div className="mx-auto max-w-6xl px-5 sm:px-8">
    <section className="pt-16 md:pt-28" aria-labelledby="how">
      <h2 id="how" className="text-balance text-4xl md:text-5xl">{t("One search. The whole journey.")}</h2>
      <p className="mt-3 max-w-2xl text-lg text-ocean/75">{t("No more stitching together ferry timetables, flight schedules and taxi calls.")}</p>
      <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
        {steps.map((step, index) => <li key={step.title} className="card relative p-6">
          <span aria-hidden="true" className="font-display absolute end-6 top-5 text-3xl text-[#D8C9A8]">{index + 1}</span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-lagoon/10 text-lagoon"><NavIcon name={index === 0 ? "plan" : index === 1 ? "sailings" : "trips"} className="h-5 w-5" /></span>
          <h3 className="font-display mt-5 text-2xl font-medium leading-tight">{t(step.title)}</h3>
          <p className="mt-2 leading-7 text-ocean/75">{t(step.body)}</p>
        </li>)}
      </ol>
    </section>

    <section className="grid gap-10 pt-20 md:grid-cols-[0.9fr_1.1fr] md:items-center md:pt-32" aria-labelledby="safe">
      <div>
        <p className="inline-flex items-center gap-2 text-sm font-medium"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-coral" />{t("Never miss a ride")}</p>
        <h2 id="safe" className="mt-3 text-balance text-4xl md:text-5xl">{t("We'd rather you arrive safely than quickly.")}</h2>
        <p className="mt-4 leading-7 text-ocean/75">{t("A fast trip with a ten-minute scramble at the jetty isn't a good trip. Every option shows its buffers in plain minutes, with a rating you can read at a glance.")}</p>
        <ul className="mt-5 space-y-3">
          {bullets.map(item => <li key={item} className="flex items-start gap-3"><span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lagoon/10 text-lagoon"><NavIcon name="check" className="h-3 w-3" /></span>{t(item)}</li>)}
        </ul>
      </div>
      <figure className="card p-5 sm:p-7" aria-label={t("Example journey")}>
        <figcaption className="inline-flex rounded-full bg-coral/15 px-3 py-1 text-xs font-semibold text-[#9A4333]">{t("Example journey")} · {t("Illustrative, not a live timetable")}</figcaption>
        <ol className="mt-6 flex items-start justify-between gap-1 overflow-x-auto pb-2">
          {exampleLegs.map((leg, index) => <li key={index} className="flex min-w-0 flex-1 flex-col items-center text-center">
            <span className={`grid h-11 w-11 place-items-center rounded-full ${index === 2 ? "bg-ocean text-white" : index === 1 || index === 3 ? "bg-[#EFE4CC] text-ocean" : "bg-[#CFE8EC] text-lagoon"}`}><NavIcon name={leg.icon} className="h-5 w-5" /></span>
            <span className="mt-2 text-xs font-semibold">{leg.from || t(leg.label)}</span>
            <span className="text-xs text-ocean/60">{leg.minutes}</span>
          </li>)}
        </ol>
        <div className="mt-5" role="img" aria-label={t("Buffer at Malé: 55 minutes, comfortable")}>
          <div className="flex justify-between text-xs font-medium"><span>{t("Buffer at Malé")}</span><span className="text-[#1F7A4D]">55 min · {t("comfortable")}</span></div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#E3EEE7]"><div className="h-full w-[88%] rounded-full bg-[#2E8B57]" /></div>
          <div className="mt-1 flex justify-between text-[11px] text-ocean/55"><span>0</span><span>{t("tight")}</span><span>{t("adequate")}</span><span>{t("comfortable")}</span></div>
        </div>
      </figure>
    </section>

    <section className="pt-20 md:pt-32" aria-labelledby="modes">
      <h2 id="modes" className="text-balance text-4xl md:text-5xl">{t("Every way to get around the atolls")}</h2>
      <p className="mt-3 max-w-2xl text-lg text-ocean/75">{t("Public ferries, speedboats, seaplanes, domestic flights, buses and taxis, in one plan.")}</p>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {modes.map(([icon, label]) => <li key={label} className="card flex flex-col items-center gap-3 p-5 text-center text-sm font-medium"><span className="grid h-11 w-11 place-items-center rounded-full bg-lagoon/10 text-lagoon"><NavIcon name={icon} className="h-5 w-5" /></span>{t(label)}</li>)}
      </ul>
      <p className="mt-3 text-sm text-ocean/65">{t("Seaplane and walking connections are planned; today the demo books ferries, flights, taxis and buses.")}</p>
    </section>

    <section className="pt-20 md:pt-32" aria-labelledby="honest">
      <h2 id="honest" className="text-balance text-4xl md:text-5xl">{t("Honest about what we know")}</h2>
      <p className="mt-3 max-w-2xl text-lg text-ocean/75">{t("Anything estimated or approximate says so, in the product and in the data.")}</p>
      <div className="mt-8 grid gap-6 border-t border-ocean/10 pt-8 md:grid-cols-3">
        {honest.map(item => <div key={item.title}><h3 className="font-display text-2xl font-medium">{t(item.title)}</h3><p className="mt-2 leading-7 text-ocean/75">{t(item.body)}</p></div>)}
      </div>
    </section>

    <section className="py-20 text-center md:py-32" aria-labelledby="cta">
      <h2 id="cta" className="text-4xl md:text-5xl">{t("Where to next?")}</h2>
      <p className="mt-3 text-lg text-ocean/75">{t("Plan your first journey in under a minute.")}</p>
      <Link href="/plan" className="mt-7 inline-flex min-h-14 items-center rounded-2xl bg-lagoon px-9 text-lg font-semibold text-white">{t("Plan a trip")}</Link>
    </section>
  </div>;
}
