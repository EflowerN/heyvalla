export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-teal-700">HeyValla · Thaa Atoll</p>
      <h1 className="text-4xl font-semibold tracking-tight">Your ferry journey, connected to your flight.</h1>
      <p className="mt-6 text-lg leading-8 text-slate-600">We’re building a simpler way to plan ferry connections to Thimarafushi Airport, book demo seats, and explore alternatives when a sailing changes.</p>
      <section className="mt-10 rounded-2xl border border-teal-200 bg-teal-50 p-6">
        <h2 className="font-semibold">Development demo</h2>
        <p className="mt-2 leading-7">Search, booking, and the operator dashboard are coming next. No real tickets or payments are available. RTL schedule access is being evaluated; there is no live RTL integration.</p>
      </section>
      <a className="mt-8 inline-block font-medium text-teal-800 underline underline-offset-4" href="/api/backend-health">Check backend connection</a>
    </main>
  );
}
