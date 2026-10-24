import Link from "next/link";

const pill = "tap inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium sm:px-4";
const dot = "h-2 w-2 rounded-full";

export default function TopBar() {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 sm:mb-10">
      <a href="#search" className="text-xl font-bold tracking-tight text-ocean">
        heyvalla<span className="text-coral">.</span>
      </a>
      <span className="pill bg-lagoon/10 text-ocean lg:order-last">Maldives · Demo</span>
      <nav aria-label="Main" className="-mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 lg:mx-0 lg:w-auto lg:rounded-full lg:border lg:border-ocean/15 lg:bg-coconut lg:p-1">
        <span aria-current="page" className={`${pill} bg-lagoon text-white`}>Plan a trip</span>
        <Link href="/greater-male-taxi" className={`${pill} hover:bg-lagoon/10`}>
          <span aria-hidden="true" className={`${dot} bg-taxi`} />
          <span className="lg:hidden">Taxi fares</span><span className="hidden lg:inline">Greater Malé taxi fares</span>
        </Link>
        <Link href="/buses" className={`${pill} hover:bg-lagoon/10`}>
          <span aria-hidden="true" className={`${dot} bg-bus`} />RTL buses
        </Link>
        <Link href="/operator" className={`${pill} hover:bg-lagoon/10`}>
          <span className="lg:hidden">Operator</span><span className="hidden lg:inline">Operator dashboard</span>
        </Link>
      </nav>
    </header>
  );
}
