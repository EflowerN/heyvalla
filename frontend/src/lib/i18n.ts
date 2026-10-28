import { dvStrings } from "./dv-strings.ts";

export const LANGS = ["en", "dv"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_COOKIE = "dhathuru_lang";

export function parseLang(value: string | undefined | null): Lang {
  return value === "dv" ? "dv" : "en";
}

// English source text is the key, so anything not yet translated falls back to English instead of breaking the page.
// Dhivehi is a first draft for the main passenger surfaces and needs review by a native speaker before launch.
const core: Record<string, string> = {
  // navigation
  "Planner": "ރޭވުން",
  "My itineraries": "އަހަރެންގެ ދަތުރުތައް",
  "Sailings": "ބޯޓު ދަތުރުތައް",
  "Taxi fares": "ޓެކްސީ ކުލި",
  "RTL buses": "ބަސް ރޫޓްތައް",
  "Boat owners": "ބޯޓު ވެރިން",
  "Plan": "ރޭވުން",
  "Trips": "ދަތުރުތައް",
  "Taxi": "ޓެކްސީ",
  "Bus": "ބަސް",
  "Owners": "ވެރިން",
  "Sections": "ބައިތައް",
  "Maldives · Demo": "ދިވެހިރާއްޖެ · ޑެމޯ",
  "Dhathuru App home": "ދަތުރު އެޕް ހޯމް",
  "Switch language": "ބަސް ބަދަލުކުރޭ",
  // planner hero
  "From your island to your doorstep": "ތިބާގެ ރަށުން ގެދޮރާ ހަމައަށް",
  "Your whole journey, in one place.": "ތިބާގެ ޖުމްލަ ދަތުރު، އެއް ތަނެއްގައި.",
  "Connect your ferry, airport transfer, flight and onward ride. Start with two places, then add your flight details.": "ފެރީ، އެއާޕޯޓަށް ދިއުން، ފްލައިޓް އަދި ފަހު ދަތުރު ގުޅުއްވާށެވެ. ފުރަތަމަ ދެ ތަނެއް އިޚްތިޔާރުކުރައްވާ، ދެން ފްލައިޓްގެ މަޢުލޫމާތު އެއްކުރައްވާށެވެ.",
  "Demo planning only. Ferry search currently connects to Thimarafushi. Flights can use checked Maldivian website references or your own details; book flights, taxis and buses through our in-app demo checkout. Onward taxis are estimates. Dhathuru App does not issue real tickets or collect payments.": "ޑެމޯ ރޭވުމަކަށް އެކަނި. ފެރީ ހޯދުން މިހާރު ގުޅިފައިވަނީ ތިމަރަފުށީގައެވެ. ފްލައިޓްތަކަށް މޯލްޑިވިއަންގެ ވެބްސައިޓުން ބެލި މަޢުލޫމާތު ނުވަތަ ތިބާގެ އަމިއްލަ މަޢުލޫމާތު ބޭނުންކުރެވޭނެއެވެ. ފްލައިޓް، ޓެކްސީ އަދި ބަސް ބުކިންގ ކުރާނީ އެޕް ތެރޭގެ ޑެމޯ ޗެކްއައުޓުންނެވެ. ފަހު ޓެކްސީ ދަތުރުތަކަކީ ލަފާކުރި އަދަދެކެވެ. ދަތުރު އެޕް އިން ޙަޤީގީ ޓިކެޓް ނުދޭ، ފައިސާ ނުނަގާ.",
  "Only need a ferry to the airport?": "އެއާޕޯޓަށް ފެރީއެއް އެކަނި ބޭނުންވޭ؟",
  // planner form
  "With a flight": "ފްލައިޓާއެކު",
  "Ferries & launches": "ފެރީ އަދި ލޯންޗް",
  "Journey type": "ދަތުރުގެ ބާވަތް",
  "Where are you?": "ތިބާ އުޅެނީ ކޮންތާކު؟",
  "Where are you going?": "ތިބާ ދަނީ ކޮންތާކަށް؟",
  "Flight date": "ފްލައިޓް ތާރީޚް",
  "Travel date": "ދަތުރުގެ ތާރީޚް",
  "Passengers": "ދަތުރުވެރިން",
  "Find my journey": "އަހަރެންގެ ދަތުރު ހޯދާ",
  "Find sea journeys": "ކަނޑުދަތުރު ހޯދާ",
  "Choose a flight": "ފްލައިޓެއް ހޮވާ",
  "Your journey": "ތިބާގެ ދަތުރު",
  "The whole route": "ޖުމްލަ މަގު",
  "Fit whole journey": "ޖުމްލަ ދަތުރު ފެނުމަށް",
  "Search": "ހޯދާ",
  "Map": "މެޕް",
  "Results": "ނަތީޖާ",
  "Planning total": "ރޭވުމުގެ ޖުމްލަ",
  "Review journey & booking options": "ދަތުރު ރިވިއު ކޮށް ބުކިންގ އިޚްތިޔާރުތައް ބައްލަވާ",
  "Fill Thaa → Hulhumalé demo": "ތާ → ހުޅުމާލެ ޑެމޯ ފުރަވާ",
  "Ferry": "ފެރީ",
  "Flight": "ފްލައިޓް",
  "Sea · Provider demo sailings": "ކަނޑު · ޕްރޮވައިޑަރުންގެ ޑެމޯ ދަތުރުތައް",
  "Find your next sailing.": "ތިބާގެ ދެން ދަތުރު ހޯދާ.",
  "Search island or vessel": "ރަށް ނުވަތަ ބޯޓު ހޯދާ",
  "All providers": "ހުރިހާ ޕްރޮވައިޑަރުން",
  "All routes": "ހުރިހާ މަގުތައް",
  "Provider": "ޕްރޮވައިޑަރު",
  "Route": "މަގު",
  "Clear filters": "ފިލްޓަރުތައް ފޮހެލާ",
  "Request seats · operator approval required": "ސީޓު ރިކުއެސްޓް · އޮޕަރޭޓަރުގެ ހުއްދަ ބޭނުން",
  "Refresh sailing updates": "ދަތުރުގެ އަދަބަދަލު އަލުން ލޯޑުކުރޭ",
  "Provider profile & coverage": "ޕްރޮވައިޑަރުގެ ޕްރޮފައިލް އަދި ސަރަހައްދު",
  "New seat requests unavailable": "އާ ސީޓު ރިކުއެސްޓް ނުލިބޭ",
  "Bus · RTL": "ބަސް · އާރްޓީއެލް",
  "Find your bus connection.": "ތިބާގެ ބަސް ގުޅުން ހޯދާ.",
  "Search route or stop": "ރޫޓް ނުވަތަ ސްޓޮޕް ހޯދާ",
  "All areas": "ހުރިހާ ސަރަހައްދުތައް",
  "Bus area": "ބަހުގެ ސަރަހައްދު",
  "View stops": "ސްޓޮޕްތައް ބައްލަވާ",
  "Airport connection": "އެއާޕޯޓް ގުޅުން",
  "Airport routes only": "އެއާޕޯޓް ރޫޓް އެކަނި",
  "No routes match. Try another route or stop name.": "ރޫޓެއް ނުފެނުނު. އެހެން ރޫޓެއް ނުވަތަ ސްޓޮޕެއް މަސައްކަތް ކުރައްވާ.",
  "Avas Ride fare matrix": "އަވަސް ރައިޑް ކުލީގެ ޖަދުވަލު",
  "Choose your zones": "ޒޯންތައް ހޮވާ",
  "Pickup zone": "ނަގާ ޒޯން",
  "Drop-off zone": "ދޫކުރާ ޒޯން",
  "Swap zones": "ޒޯންތައް ބަދަލުކުރޭ",
  "Your fare estimate": "ތިބާގެ ކުލީގެ ލަފާ",
  "Closest checked dates": "ބެލި ކައިރީ ތާރީޚްތައް",
  "Reference fare category": "ރެފަރެންސް ކުލީގެ ބާވަތް",
  "Use manual flight details instead": "ފްލައިޓް މަޢުލޫމާތު އަމިއްލައަށް ޖަހާ",
  "Use this flight in my journey": "މި ފްލައިޓް އަހަރެންގެ ދަތުރަށް ބޭނުންކުރޭ",
  "Your selected date": "ތިބާ ހޮވި ތާރީޚް",
  "Maldivian adult": "މޯލްޑިވިއަން ބޮޑު މީހާ",
  "Find flights & nearby dates": "ފްލައިޓާއި ކައިރީ ތާރީޚްތައް ހޯދާ",
  "Dhathuru App · Demo journeys": "ދަތުރު އެޕް · ޑެމޯ ދަތުރުތައް",
  "Your whole connection": "ތިބާގެ ޖުމްލަ ގުޅުން",
  "Refresh itineraries": "ދަތުރުތައް އަލުން ލޯޑުކުރޭ",
  "Flight departure · Maldives time": "ފްލައިޓް ފުރާގަޑި · ދިވެހި ވަގުތު",
  "Retry locations": "ތަންތަން އަލުން މަސައްކަތް ކުރޭ",
  "Demo flight time is illustrative; confirm your actual flight.": "ޑެމޯ ފްލައިޓް ގަޑި މިސާލަކަށް؛ ޙަޤީގީ ފްލައިޓް ކަށަވަރުކުރައްވާ.",
  // shared
  "Demo": "ޑެމޯ",
  "Cancel": "ކެންސަލް",
  "Refresh": "އަލުން ލޯޑުކުރޭ",
  "Book": "ބުކް ކުރޭ",
};

const dv: Record<string, string> = { ...core, ...dvStrings };

export function translate(lang: Lang, text: string): string {
  return lang === "dv" ? (dv[text] ?? text) : text;
}

export function dhivehiCoverage() {
  return Object.keys(dv).length;
}
