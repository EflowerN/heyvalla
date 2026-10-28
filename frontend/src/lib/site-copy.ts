// Static copy for the landing and help pages, kept here so tests can check every line has a Dhivehi translation.
export const steps = [
  { title: "Tell us where and when", body: "Pick your island, your destination and either when you want to leave or when you must arrive." },
  { title: "We check every connection", body: "Each hand-over gets a minimum buffer and a plain rating. Fragile trips are flagged, not hidden." },
  { title: "Book it all in one place", body: "Demo checkout for the legs we can book, with every reservation kept together in My trips." },
] as const;

export const bullets = [
  "Hard minimum buffers per connection, set by your buffer setting",
  "Tight hand-overs are flagged, never hidden",
  "Every option explains its timing in plain language",
] as const;

export const exampleLegs = [
  { icon: "sailings", label: "Ferry", minutes: "50 min", from: "Maafushi" },
  { icon: "taxi", label: "Taxi", minutes: "10 min", from: "" },
  { icon: "plane", label: "Domestic flight", minutes: "1 h 5 min", from: "" },
  { icon: "taxi", label: "Taxi", minutes: "15 min", from: "" },
] as const;

export const modes = [
  ["sailings", "Ferries"], ["sailings", "Speedboats"], ["plane", "Seaplanes"], ["plane", "Domestic flights"], ["bus", "Buses"], ["taxi", "Taxis"], ["owners", "Walking links"],
] as const;

export const honest = [
  { title: "Taxi fares are estimates", body: "Fares that are not published are shown as estimates and labelled that way." },
  { title: "Sea routes are illustrative", body: "Lines on the map connect reference points. They are not navigational charts." },
  { title: "Maldives time, always", body: "Every time in the app is Maldives time (UTC+5)." },
] as const;

export const faq = [
  ["What is a connection buffer?", "The spare time between one leg ending and the next starting, for example the minutes between a ferry arriving and the next ferry leaving. Longer buffers are safer; very short ones are flagged as tight."],
  ["How do the buffer ratings work?", "Your buffer setting decides the thresholds. Balanced rates 25–39 minutes between boats as adequate and 40 or more as comfortable; Cautious asks for 45 and 60; Relaxed accepts 15 and 30. Anything below your minimum is marked tight, never hidden."],
  ["Why are some prices marked as estimated?", "Not every operator publishes fares. When a price is not listed we show a clearly labelled estimate or reference. Estimated fares may change, and nothing here is charged."],
  ["What happens if a ferry or flight runs late?", "This demo does not track live delays or rebook automatically. Owners can post last-call and cargo notices, and optionally a manually reported position, which appear in My trips. Always confirm timings with the operator."],
  ["Which time zone do you use?", "Maldives time (UTC+5) everywhere, including search times and departure times."],
  ["Can I really book and pay?", "No. Confirmations are simulated: no payment is collected, no real tickets are issued and no vehicles are dispatched."],
  ["What does my account do?", "An account keeps your trips with you across devices. Without one, your trips are tied to this browser's cookie and are lost if you clear it."],
] as const;
