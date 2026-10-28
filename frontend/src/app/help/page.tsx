import type { Metadata } from "next";
import FaqList from "../components/FaqList";

export const metadata: Metadata = { title: "Help and questions" };
export default function Help() {
  return <main className="mx-auto max-w-3xl px-5 py-12 md:py-20">
    <h1 className="text-4xl md:text-5xl">Help and questions</h1>
    <p className="mt-3 text-lg text-ocean/75">Short answers about how Dhathuru plans your journey.</p>
    <FaqList />
    <p className="mt-8 text-sm text-ocean/65">Sea routes on maps are illustrative, never for navigation. Fares marked estimated may change. All times are Maldives time (UTC+5).</p>
  </main>;
}
