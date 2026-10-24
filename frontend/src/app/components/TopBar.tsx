import Link from "next/link";

const pill = "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-90";

export default function TopBar() {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ocean/15 pb-5">
      <Link href="/" className="text-xl font-bold tracking-tight text-ocean">heyvalla<span className="text-coral">.</span></Link>
      <span className="rounded-full bg-lagoon/10 px-3 py-1 text-xs font-semibold text-ocean sm:order-last">Maldives · Demo</span>
      <nav aria-label="Transport tools" className="flex w-full flex-wrap gap-2 sm:w-auto">
        <Link href="/greater-male-taxi" className={`${pill} bg-taxi text-white`}>Greater Malé taxi fares</Link>
        <Link href="/buses" className={`${pill} bg-bus text-white`}>RTL buses</Link>
        <Link href="/operator" className={`${pill} border border-ocean/20 bg-white text-ocean`}>Operator dashboard</Link>
      </nav>
    </header>
  );
}
