import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };
export default function Privacy() {
  return <main className="mx-auto max-w-3xl px-5 py-12 md:py-20 [&_h2]:mt-8 [&_h2]:text-2xl [&_p]:mt-3 [&_p]:leading-7 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:ps-6 [&_li]:mt-1">
    <h1 className="text-4xl md:text-5xl">Privacy</h1>
    <p className="rounded-xl bg-amber-50 p-4 text-sm">Plain-language draft for the demonstration. It is not legal advice and should be reviewed by a qualified adviser before any public launch.</p>
    <h2>What we store</h2>
    <ul><li>The sample details you enter when you book or request a demo service: passenger name, email, seats and journey details.</li><li>Your account email, optional name and a hashed password, if you create an account.</li><li>A cookie that identifies your browser so your trips can be shown to you, and a language cookie.</li></ul>
    <h2>What we do not do</h2>
    <ul><li>We do not collect payments or card details.</li><li>We do not send booking emails or text messages.</li><li>Address notes are not geocoded and are not shared with ferry providers.</li></ul>
    <h2>Boat positions</h2>
    <p>Boat owners can link a boat that is public on FollowMe. Only that owner-authorised position is shown, from shortly before departure, with FollowMe attribution.</p>
    <h2>Clearing your data</h2>
    <p>Clearing cookies removes access to trips that are not tied to an account. Use sample details only while this is a demonstration.</p>
  </main>;
}
