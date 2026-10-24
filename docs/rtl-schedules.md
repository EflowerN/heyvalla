# RTL schedule source strategy

## Evidence and limits

RTL's official customer portal is https://www.rtl.mv/ and advertises the RTL Travel App. MTCC also publishes schedules at https://mtcc.mv/schedules-2/ . These are candidate official sources for a manually verified schedule dataset.

Checked on 2026-10-24: the RTL portal is JavaScript-based and its schedule contents were not available through text retrieval; the MTCC schedule page returned HTTP 403 to that retrieval. Current Thaa routes/times, a documented public API, reuse terms, update frequency, and third-party booking access have **not** been verified. Access through the RTL app does not establish an API integration or permission to redistribute its data.

## First version

- Begin with explicitly fictional fixtures so development is independent of RTL access.
- Manually verify the chosen Thaa pilot routes in the official RTL app/site before introducing real timetable entries.
- Record route/direction, ordered stops, service days, departure/arrival times, exceptions, validity dates, official reference, and last verification timestamp.
- Attribute official schedule entries to RTL/MTCC, label their verification time, and distinguish them from sample entries.
- Display scheduled times as scheduled, never live. Only a verified update source may supply real cancellations/delays; dashboard simulations stay labelled.
- A timetable does not supply bookable capacity. Dhathuru App bookings remain simulated. For actual RTL purchases, direct passengers to the official service until an approved integration exists.

## Import design for a later milestone

Use a Laravel schedule-source interface with a fixture implementation first. Add an approved RTL feed implementation only after access and terms are established. A CSV upload can support operator-reviewed manual entry without coupling the planner to external response formats.

Import to a staging/review step: validate times, stop mapping, service dates and duplicate external IDs; preview changes; publish with source metadata. Preserve existing dated sailings and booking history. Record imported/verified timestamps separately. Define freshness thresholds once the source's update cadence is known; flag stale entries and never overwrite a newer verified disruption with an old schedule.

## Questions for RTL/MTCC

Is there an approved schedule feed/API or GTFS export? Does it cover Thaa and Thimarafushi? What reuse/attribution terms apply? How are service exceptions and cancellations published? Is third-party booking supported, with inventory, confirmation, cancellation, and refund workflows?

## Retrieved schedule snapshot — 24 October 2026

The official page at https://rtl.mv/#/schedule-details was accessible through the browser. All 27 displayed ferry route cards were expanded and their timetables captured. The normalized snapshot is `backend/resources/data/rtl-schedules.json`: 27 route codes and 238 time/island entries. Every extracted island label was checked against its route card's listed stops. It is a snapshot of this page's displayed cards, not a claim that all RTL routes nationwide are present.

The records preserve displayed stop order, including return journeys, rather than guessing trip identifiers or service calendars. Operating weekdays, validity dates, live cancellation information, and seat inventory were not supplied in these extracted cards. Keep `service_days`, `valid_from`, and `valid_until` unknown. Do not generate daily dated sailings or enable RTL bookings from this snapshot alone.

Relevant Thaa routes include Z4R1 (Buruni–Veymandoo through Vilufushi, Madifushi, Dhiyamigili and Guraidhoo), Z4R2 (Kandoodhoo–Veymandoo), Z4R3 (Gaadhiffushi–Veymandoo through Thimarafushi), Z4R4 (Veymandoo–Thimarafushi), and Z4R5 (Veymandoo–Gaadhiffushi). Z4R4 shows Veymandoo 08:35 → Thimarafushi 08:45 and the return Thimarafushi 10:30 → Veymandoo 10:40. Z4R3 shows Gaadhiffushi 08:25 → Thimarafushi 08:40 → Veymandoo 08:55, then Veymandoo 13:25 → Thimarafushi 13:35 → Gaadhiffushi 13:55. These are displayed local times, not a confirmed service for a selected date.

The fictional HV-series schedules and booking tables are unchanged by this retrieval. Next integration work must confirm service calendars and timetable validity, map RTL stop labels to the island/harbour directory, identify distinct trips, and validate transfer feasibility before using this source in flight-connection results. No documented public API or third-party ticketing access has been established by reading the page.
