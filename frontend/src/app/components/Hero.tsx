import type { ReactNode } from "react";

export default function Hero({ eyebrow, title, body, children }: { eyebrow: string; title: string; body: string; children?: ReactNode }) {
  return <section className="hero px-6 pb-24 pt-8 sm:px-10 sm:pt-10">
    <p className="text-xs font-bold uppercase tracking-widest text-white/80">{eyebrow}</p>
    <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">{title}</h1>
    <p className="mt-4 max-w-2xl leading-7 text-white/85">{body}</p>
    {children && <div className="mt-4 max-w-3xl rounded-2xl bg-white/12 p-3 text-sm leading-6 text-white/90 backdrop-blur-sm [&_a]:font-semibold [&_a]:text-white [&_a]:underline">{children}</div>}
    <svg className="hero-waves slow" viewBox="0 0 1200 64" preserveAspectRatio="none" aria-hidden="true"><path d="M0 32q75-28 150 0t150 0 150 0 150 0 150 0 150 0 150 0 150 0v32H0z" fill="#F3F7F7" /></svg>
    <svg className="hero-waves" viewBox="0 0 1200 64" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40q75-24 150 0t150 0 150 0 150 0 150 0 150 0 150 0 150 0v24H0z" fill="#F3F7F7" /></svg>
  </section>;
}
