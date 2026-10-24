const icon = "h-5 w-5";

export default function MobileNav({ resultCount }: { resultCount: number | null }) {
  const item = "tap flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-ocean/75";
  return (
    <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-[1000] border-t border-ocean/10 bg-coconut/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md">
        <a href="#search" className={item}>
          <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          Search
        </a>
        <a href="#map" className={item}>
          <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
          Map
        </a>
        <a href="#results" className={item}>
          <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>
          Results{resultCount !== null && <span className="ml-1 rounded-full bg-coral/30 px-1.5 text-[10px]">{resultCount}</span>}
        </a>
      </div>
    </nav>
  );
}
