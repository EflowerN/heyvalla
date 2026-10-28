import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of use" };
export default function Terms() {
  return <main className="mx-auto max-w-3xl px-5 py-12 md:py-20 [&_h2]:mt-8 [&_h2]:text-2xl [&_p]:mt-3 [&_p]:leading-7 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:ps-6 [&_li]:mt-1">
    <h1 className="text-4xl md:text-5xl">Terms of use</h1>
    <p className="rounded-xl bg-amber-50 p-4 text-sm">Plain-language draft for the demonstration. It is not legal advice and should be reviewed by a qualified adviser before any public launch.</p>
    <h2>A working demo</h2>
    <p>Dhathuru App is a demonstration. Confirmations are simulated: no payment is collected, no real ticket is issued, no vehicle is dispatched and no operator inventory is reserved. Do not rely on it to make real travel arrangements.</p>
    <h2>Information we show</h2>
    <ul><li>Schedules may be fictional fixtures, public reference snapshots or entries typed in by boat owners, and are labelled accordingly.</li><li>Taxi fares and some prices are estimates and may change.</li><li>Map lines are illustrative and must never be used for navigation.</li><li>Boat positions, where shown, come from owner-linked sources, may be delayed or inaccurate, and must not be used for safety decisions.</li></ul>
    <h2>Your account and details</h2>
    <p>Use sample names and details. Keep your password private; anyone who has it can see your trips. Accounts that look abusive may be removed.</p>
    <h2>Boat owners</h2>
    <p>Owners are responsible for the accuracy of what they publish and for confirming they operate any vessel they link to a tracking service.</p>
    <h2>Changes</h2>
    <p>The demo and these terms may change at any time.</p>
  </main>;
}
