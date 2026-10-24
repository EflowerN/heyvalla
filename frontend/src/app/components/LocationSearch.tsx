"use client";

import { useState } from "react";
import { matchesLocation, type Place } from "@/lib/journey-plan";

export default function LocationSearch({ id, label, places, value, selected, onChange, onSelect, disabled }: {
  id: string; label: string; places: Place[]; value: string; selected: Place | null; onChange: (value: string) => void; onSelect: (place: Place) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = places.filter(place => matchesLocation(place, value));
  const visible = matches.slice(0, 40);
  const pick = (place: Place) => { onSelect(place); setOpen(false); setActive(0); };
  return <div className="relative min-w-0">
    <label htmlFor={id} className="block text-base font-semibold">{label}</label>
    <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open && visible[active] ? `${id}-${active}` : undefined}
      autoComplete="off" disabled={disabled} value={value} placeholder="Search island, atoll or airport" required
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(0); }}
      onFocus={() => { setOpen(true); setActive(0); }} onBlur={() => setOpen(false)}
      onKeyDown={event => {
        if (event.key === "Escape") setOpen(false);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(index => Math.max(0, Math.min(visible.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))); }
        if (event.key === "Enter" && open) { event.preventDefault(); if (visible[active]) pick(visible[active]); }
      }} className="mt-2 w-full rounded-2xl border border-ocean/15 bg-white p-4 shadow-sm text-base outline-offset-2 focus:outline-lagoon" />
    <p className="mt-2 text-xs text-ocean/65">{selected ? `${selected.iata ? `Airport · ${selected.iata}` : `${selected.atoll} · ${selected.category === "resort" ? "Resort island" : "Inhabited island"}`} · Selected` : "Type a location, then select a match."}</p>
    {open && <div className="absolute z-[1100] mt-2 w-full overflow-hidden rounded-2xl border border-ocean/10 bg-white shadow-xl">
      <ul id={`${id}-options`} role="listbox" aria-label={`${label} matches`} className="max-h-64 overflow-y-auto">
        {visible.map((place, index) => <li key={place.id} id={`${id}-${index}`} role="option" aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => pick(place)} className={`cursor-pointer px-4 py-3 text-sm hover:bg-lagoon/10 ${active === index ? "bg-lagoon/10" : ""}`}>
          <span className="font-semibold">{place.name}</span><span className="ml-2 text-ocean/60">{place.iata ?? place.atoll}{place.category === "resort" ? " · Resort" : ""}</span>
        </li>)}
      </ul>
      <p role="status" className="border-t border-ocean/10 p-3 text-xs text-ocean/65">{matches.length ? `${matches.length} matches${matches.length > 40 ? " · Showing first 40; keep typing to narrow the list" : ""}` : "No matching locations. Try a shorter name or an atoll."}</p>
    </div>}
  </div>;
}
