# Datathon datasets: usefulness for Dhathuru App

Reviewed 24 October 2026. Inspected every table/CSV in the MTCC, MACL and Avas Ride release v1.0 archives. This is an assessment only: no application data, booking rules or runtime screens were changed. Original archives and analysis intermediates remain in the task's work directory, outside the application repository.

## Recommendation

Prioritize the Avas Ride fare matrix for a separately labelled Greater Malé airport-transfer prototype, after confirming currency and validity. Keep the Thimarafushi taxi quote workflow independent. Use MTCC only for explicitly synthetic demo analytics. Use MACL for historical aggregate airport-traffic context after cleaning; do not use it as a flight lookup or delay feed.

None of these packages supplies live ferry capacity, taxi/boat availability, or a confirmed future flight schedule. They do not resolve missing operating weekdays/validity in the separate RTL webpage snapshot.

## MTCC

### Verified contents

- `MTCC.xlsx`: README and three data sheets.
- `bus_monthly`: 180 records, January 2023–December 2025, five routes: R1, R2, R3, R4 and R7.
- `bus_daily`: 1,095 records, calendar year 2025, three routes: R1, R2 and R4.
- `ferry_monthly`: 258 records across eight route IDs, January 2023–December 2025. Coverage: Haa Alifu, Lhaviyani, Noonu, and Gaafu Alifu & Gaafu Dhaalu. No Thaa records.
- README explicitly states: route names/codes are real; passenger figures are randomly generated and are not actual MTCC/RTL data. It describes built-in seasonality, growth, Friday dips and disruption dips as sample patterns.

### Useful incorporation

1. A labelled demo operator analytics screen: synthetic monthly passenger counts, seasonality and sample route comparisons.
2. Candidate Greater Malé bus options to investigate: R3 is Male (West Park)–Velana Airport; R4 is Hulhumale Phase 1–Velana Airport. Their existence in this historical sample is not a current schedule verification.
3. Representative fixtures for analytics/import testing.

### Limits

There are no departure times, service weekdays, dated sailings, seat capacities, prices, live cancellations or Thaa demand data. Do not use the synthetic counts to claim observed transport problems, train an actual-demand forecast, calculate real cancellation probabilities, or size a real fleet. Route IDs such as H1 and R2C1 need reviewed mapping to current RTL codes; do not join by similar-looking IDs alone.

## MACL

### Verified contents

- `Airport traffic_Dataset_27092026.csv`: 168,959 movement records, 20 columns, plus `Metadata.csv`.
- Departure dates span 1 January 2012–31 July 2026. Values are month/day/year, despite metadata saying YYYY-MM-DD.
- Fields include movement dates, flight type, anonymized carrier/route codes, destination region, aircraft type/category, arriving/transit/departing passenger counts, actual arrival time (`ata`) and actual departure time (`atd`).
- 167,151 records are labelled SCHEDULED and 1,808 CHARTER. SCHEDULED is a flight-type category, not a scheduled departure timestamp.
- All route values are generic `Route_...` codes (1,008 distinct values). Populated carrier values are generic `Carrier_...` codes. No decoding table accompanies the package.

### Useful incorporation

1. Historical traffic context: arrivals/departures by hour, month, region or aircraft category after date/time and time-zone validation.
2. A separate airport operations analytics demo showing when transfer demand might be concentrated. Passenger demand proxies should be labelled and based on the relevant passenger count fields, not just record counts.
3. Test fixtures for flight data import with explicit unknown mappings and invalid-record handling.

### Limits and cleaning

No flight number, usable airport identifier mapping, scheduled arrival/departure times, check-in deadlines or real-time status is supplied. We cannot identify Thimarafushi movements, look up a user's flight, calculate actual-versus-scheduled delay, or confirm route geography from these anonymous codes.

Arrival dates include eleven 1970-01-01 values and one 2011 value; the latter is not automatically an error because a preceding-day arrival may be legitimate. One arrival date is blank. `ata` has 72 blanks and 15 numeric strings that are not clock times; `atd` has 71 blanks and 15 such strings. Do not reinterpret these serial-like values as time of day without clarification. One carrier value is blank. Record IDs are unique. Time zone is not specified in the supplied metadata and must be confirmed before combining these timestamps with Maldives-time journeys.

## Avas Ride

### Verified contents

- `avas_rides_aug_sep_2026.csv`: 371,788 rows, eight columns, from 1 August 2026 00:00:24 to 30 September 2026 23:59:54.
- Columns: `date_started`, pickup/dropoff latitude/longitude, `distance_km`, `time_sec`, and `status`. No fare, passenger name, phone, vehicle ID, driver availability, request timestamp or acceptance timestamp is present.
- Status counts: 320,140 `payment_completed`; 24,401 `ride_completed`; 27,247 `ride_expired`.
- Pickup/dropoff coordinates lie around Greater Malé; the fare matrix is explicitly labelled Male City. This is not Thaa/Thimarafushi coverage.
- No blank fields, unparseable numeric fields or exact duplicate rows were found in the trip CSV.
- `car_fare_matrix.csv`: six origin rows × six destination columns: Male, Hulhumale Phase 1, Velana International Airport, Hulhumale Phase 2, Sea Plane and Domestic Terminal.
- Matrix examples as supplied: Male → Velana Airport = 70; Hulhumale Phase 1 → Velana Airport = 80; Hulhumale Phase 2 → Velana Airport = 85; Velana Airport → Domestic Terminal = 30. The CSV does not state currency or effective dates.

### Useful incorporation

1. Strongest near-term candidate: add a Greater Malé airport-transfer demo with zone selection and dataset-based fare suggestions. Store amounts with explicit verified currency and validity; retain operator confirmation rather than automatically issuing real fares.
2. Calibrate historical travel-duration ranges for covered areas after confirming `time_sec` semantics, time zone, data authenticity and suitable origin/destination grouping. Exclude `ride_expired` from completed-trip estimates. Do not call `time_sec` a wait-to-pickup measure.
3. An aggregate operator view of completed trips by start hour or origin/destination zone. It can guide a staffing hypothesis, but not reveal live driver locations or availability.

### Limits and quality checks

The package has no data dictionary defining status semantics, timing boundaries, currency, time zone or zone polygons. Payment-completed and ride-completed labels can be grouped provisionally for exploratory analysis, but confirm their interpretation before product use. Expired rides must not be presented as completed trips or automatically labelled driver cancellations. No per-trip fare is present, so the matrix cannot be validated against paid amounts.

For exploratory context only, the 344,541 payment-completed/ride-completed records have median `time_sec`/60 of 12.63 minutes, 90th percentile 15.85 minutes, and 95th percentile 16.54 minutes. These are whole-dataset descriptive statistics, not a harbour-to-airport estimate and not a Thimarafushi estimate. Percentiles use the sorted observation at the rounded index `(n−1) × p`; median uses the usual middle-observation convention. Coordinate coverage, timestamps, distance and duration semantics require review before predictive claims.

Trip-level pickup/dropoff coordinates are precise mobility data. Keep raw records outside the public app and Git repository; expose aggregated zones/time buckets if used. No raw trip coordinates or sample trajectories are included in this report. Public download does not make individual trajectories necessary to display.

## Proposed implementation order

1. Add reviewed import/staging tables separate from live bookings. Preserve dataset version, source flags and unknown fields rather than silently replacing demo constants.
2. Confirm Avas fare currency, effective dates and zone definitions; build a Greater Malé fare estimator with editable operator quotes. Do not alter the Thimarafushi default price based on this matrix.
3. Add aggregate Avas duration estimates per verified route/zone/time bucket with sample counts and historical labels. Keep waiting time separate because it is not measured here.
4. Optionally add clearly labelled synthetic MTCC charts to the demo dashboard; there is no evidence benefit from presenting these as real demand.
5. Add MACL historical charts only if useful for the presentation, after cleaning and timezone clarification. Request route/carrier mappings and a scheduled/current flight feed before any passenger flight lookup.

## Clarifications to request from organizers

- Avas: currency/validity of fares, zone polygons, time zone, definition of `time_sec` and each status, and whether trip records are real, anonymized or synthetic.
- MACL: route/carrier codebook, movement/airport scope, timezone, scheduled-time fields if available, and explanation of malformed dates/times.
- MTCC: any real Thaa timetable/calendar, operational disruption or capacity dataset beyond the synthetic passenger workbook.

## Reproducibility

The three archives were downloaded from the organizer's Maldives Datathon 2026 repository release v1.0. Per the user's organizer-source exemption, no additional formal public-source reference is required. Internal package hashes are retained below so a later refresh can be compared. No application integration or push was performed.

- Avas_Ride.zip: `959e575f01d4b08f75517fe5a196de127dc0e498a6648f1f179238405aff2f1b`
- MACL.zip: `72428c8b5f57301987ceeb832070fc81f27423e5e213534b9c5610f70716e5b3`
- MTCC.zip: `536837c3fcab235d297733a42d8bb9661768ea8a9cdcaeb43cabbdb9e024d17a`

## Subsequent clarification and implementation

On 24 October 2026 the user confirmed that the Avas fare matrix currency is MVR. This resolves the earlier currency question through project-owner confirmation, not a new source field. Fare effective dates and zone boundaries remain unknown. The separate Greater Malé estimator now uses the matrix as MVR reference values; Thimarafushi quotes and taxi timings are unchanged.
