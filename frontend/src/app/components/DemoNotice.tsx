export default function DemoNotice() {
  return (
    <details className="group mb-8 rounded-2xl border border-coral/50 bg-coral/10 px-4 py-3 text-sm leading-6">
      <summary className="tap flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
        <span>Demo only: fictional sailings, not RTL schedules, no real tickets.</span>
        <span aria-hidden="true" className="text-lagoon transition-transform group-open:rotate-180">▾</span>
      </summary>
      <p className="pb-2 pt-1 text-ocean/80">
        Demonstration only. All sailings, durations, cancellations, and transfer allowances are fictional. They repeat
        daily for testing and are not RTL schedules. No real tickets are available.
      </p>
    </details>
  );
}
