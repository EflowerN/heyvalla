"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import BookingDesk, { type BookingChoice } from "../components/BookingDesk";
import DemoNotice from "../components/DemoNotice";
import Footer from "../components/Footer";
import MobileNav from "../components/MobileNav";
import ResultsPanel from "../components/ResultsPanel";
import SearchCard from "../components/SearchCard";
import TransportLegend from "../components/TransportLegend";
import type { Airport, Island, Result } from "../ferry";

const TransportMap = dynamic(() => import("../components/TransportMap"), {
  ssr: false,
  loading: () => <p className="card p-6">Loading interactive map…</p>,
});

export default function Home() {
  const searchRequest = useRef<AbortController|null>(null);
  const [islands, setIslands] = useState<Island[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [island, setIsland] = useState("ld0205");
  const [islandFilter, setIslandFilter] = useState("");
  const [airport, setAirport] = useState("VRNT");
  const [bookingChoice, setBookingChoice] = useState<BookingChoice | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [islandError, setIslandError] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const hadResult = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/islands", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Could not load islands. Reload this page to try again.");
      const data = await response.json(); setIslands(data.islands); setAirports(data.airports);
    }).catch(error => { if (!controller.signal.aborted) setIslandError(error.message); });
    return () => controller.abort();
  }, []);

  // Results sit below the map, so bring them into view after a new search.
  // A background refresh after booking (result stays set) does not re-scroll.
  useEffect(() => {
    const isNewResult = !!result && !hadResult.current;
    hadResult.current = !!result;
    if (!isNewResult && !error) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [result, error]);

  const selectIsland = useCallback((id: string) => {
    searchRequest.current?.abort(); setLoading(false);
    setIsland(id); setIslandFilter(""); setResult(null); setBookingChoice(null); setError("");
  }, []);
  const selectAirport = useCallback((id: string) => {
    searchRequest.current?.abort(); setLoading(false);
    setAirport(id); setResult(null); setBookingChoice(null); setError("");
  }, []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    data.forEach((value, key) => query.set(key, String(value)));
    searchRequest.current?.abort(); const controller = new AbortController(); searchRequest.current = controller;
    setLoading(true); setError(""); setResult(null); setBookingChoice(null);
    try {
      const response = await fetch(`/api/ferry-search?${query}`, {signal: controller.signal});
      const body = await response.json();
      if (!response.ok) throw new Error(body.errors ? Object.values(body.errors).flat().join(" ") : body.message);
      if (!controller.signal.aborted) setResult(body);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not search. Please try again.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pt-6 pb-28 sm:px-8 sm:pt-8 md:pb-16">
      <div className="mb-6 max-w-2xl"><p className="text-sm font-semibold uppercase tracking-widest text-lagoon">From your island to your flight</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Find a ferry that fits your flight.</h1>
        <p className="mt-3 leading-7 text-ocean/80">Choose from inhabited islands, resort islands, and land airports across the Maldives. Demo ferry connections currently serve Thimarafushi Airport.</p>
      </div>
      <DemoNotice />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[360px_1fr] lg:gap-8">
        <div id="search" className="scroll-mt-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:rounded-2xl">
          <SearchCard
            islands={islands} airports={airports} island={island} airport={airport}
            islandFilter={islandFilter} onIslandFilter={setIslandFilter}
            onIslandChange={selectIsland} onAirportChange={selectAirport}
            onSubmit={search} loading={loading} islandError={islandError}
          />
        </div>
        <div className="min-w-0">
        <div id="map" className="scroll-mt-4">
          <TransportLegend />
          <TransportMap island={island} airport={airport} onIslandSelect={selectIsland} onAirportSelect={selectAirport} />
        </div>
        <div id="results" ref={resultsRef} className="scroll-mt-4">
          <BookingDesk choice={bookingChoice} onClose={() => setBookingChoice(null)} onBooked={() => {
            if (result) fetch(`/api/ferry-search?${new URLSearchParams(Object.entries(result.search).map(([key, value]) => [key, String(value)]))}`).then(response => response.ok ? response.json() : null).then(data => { if (data) setResult(data); }).catch(() => {});
          }} />
          <ResultsPanel result={result} error={error} loading={loading} onBook={setBookingChoice} />
        </div>
        </div>
      </div>
      <Footer
        residential={islands.filter(item => item.category === "residential").length}
        resorts={islands.filter(item => item.category === "resort").length}
        airports={airports.length}
      />
      <MobileNav resultCount={result ? result.sailings.filter(s => s.bookable).length : null} />
    </main>
  );
}
