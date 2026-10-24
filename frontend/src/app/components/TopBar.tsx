import Link from "next/link";

export default function TopBar() {
  return (
    <header className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-ocean/15 pb-6">
      <span className="text-xl font-bold tracking-tight text-ocean">heyvalla<span className="text-coral">.</span></span>
      <Link href="/greater-male-taxi" className="text-sm font-medium text-lagoon underline">Greater Malé taxi fares</Link>
      <Link href="/buses" className="rounded-full bg-bus px-3 py-1 text-sm font-medium text-white">RTL buses</Link>
      <Link href="/operator" className="text-sm font-medium text-lagoon underline">Operator dashboard</Link>
      <span className="rounded-full bg-lagoon/10 px-3 py-1 text-xs font-semibold text-ocean">Maldives · Demo</span>
    </header>
  );
}
