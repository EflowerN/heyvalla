import Link from "next/link";

export default function SubHeader({ backHref = "/", backLabel, aside }: { backHref?: string; backLabel: string; aside?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-ocean/15 pb-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="text-xl font-bold tracking-tight text-ocean">heyvalla<span className="text-coral">.</span></Link>
        <Link href={backHref} className="tap inline-flex items-center rounded-full border border-ocean/20 bg-white px-4 text-sm font-medium text-lagoon hover:bg-lagoon/10">← {backLabel}</Link>
      </div>
      {aside}
    </header>
  );
}
