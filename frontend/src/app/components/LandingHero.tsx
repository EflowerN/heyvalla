"use client";

import Hero from "./Hero";
import TripSearchForm from "./TripSearchForm";
import { useT } from "./I18nProvider";

export default function LandingHero() {
  const t = useT();
  return <>
    {/* Phones keep the app hero: gradient, waves and a floating card. */}
    <div className="mx-auto max-w-6xl px-5 pt-5 md:hidden">
      <Hero eyebrow={t("From your island to your doorstep")} title={t("Island to island, door to door.")} body={t("Ferry, taxi, flight and taxi again, planned and booked together. Never a connection you can't make.")} />
      <div className="float-card mx-1"><TripSearchForm /></div>
    </div>
    {/* Desktop follows the web design: sky, islands, sea, and the search card on the water. */}
    <section className="relative hidden overflow-hidden md:block" aria-label={t("Plan a trip")}>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#FBF7EF] via-[#EAF4F5] to-[#C9E2E6]" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-[31rem] bg-gradient-to-b from-[#8CC3CA] via-[#4A97A3] to-[#2B7380]">
        <div className="sea-shimmer absolute inset-0" />
      </div>
      <svg aria-hidden="true" className="absolute inset-x-0 bottom-[30.5rem] w-full" viewBox="0 0 1200 80" preserveAspectRatio="none" height="80">
        <g fill="#2F6F78"><path d="M60 80 C120 52 220 46 300 80Z" /><path d="M360 80 C400 66 470 62 520 80Z" /><path d="M900 80 C960 50 1080 42 1200 70 L1200 80Z" /></g>
        <g fill="#E9DFC6"><path d="M50 80 C120 62 230 60 310 80Z" opacity=".9" /><path d="M890 80 C960 64 1090 58 1200 76 L1200 80Z" opacity=".9" /></g>
      </svg>
      <div className="relative z-10 mx-auto max-w-6xl px-8 pb-16 pt-14 text-center">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-ocean/10 bg-white/80 px-4 py-1.5 text-sm shadow-sm"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-coral" />{t("Every island, one journey")}</p>
        <div className="relative mx-auto mt-6 max-w-3xl">
          <span aria-hidden="true" className="absolute -right-4 top-2 h-24 w-24 rounded-full bg-coral/85 shadow-[0_0_80px_30px_rgba(242,140,120,0.45)]" />
          <h1 className="relative text-balance text-7xl leading-[1.02] text-ocean">{t("Island to island, door to door.")}</h1>
        </div>
        <p className="mx-auto mt-6 max-w-xl text-xl leading-8 text-ocean/80">{t("Ferry, taxi, flight and taxi again, planned and booked together. Never a connection you can't make.")}</p>
        <div className="mx-auto mt-14 max-w-4xl rounded-[2.25rem] bg-white/40 p-3 text-start shadow-[0_30px_80px_-30px_rgba(13,43,51,0.6)] backdrop-blur-sm"><TripSearchForm /></div>
      </div>
    </section>
  </>;
}
