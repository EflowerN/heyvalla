"use client";

import { useT } from "./I18nProvider";
import { faq } from "@/lib/site-copy";

export default function FaqList() {
  const t = useT();
  return <div className="mt-8 divide-y divide-ocean/10 border-y border-ocean/10">
    {faq.map(([question, answer]) => <details key={question} className="group py-1">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">{t(question)}<span aria-hidden="true" className="text-2xl text-lagoon transition group-open:rotate-45">+</span></summary>
      <p className="pb-5 pe-8 leading-7 text-ocean/80">{t(answer)}</p>
    </details>)}
  </div>;
}
