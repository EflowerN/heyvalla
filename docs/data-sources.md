# Public data source register

Maintain this register whenever public data is added or refreshed. Retrieval dates below are 24 October 2026. Source snapshots are not live availability guarantees.

## OneMap island directory

- Publisher: Geomatics Department, Ministry of Infrastructure, Housing and Urban Development, Republic of Maldives.
- Source/documentation: https://readme.onemap.mv/
- Dataset: https://services7.arcgis.com/yvCbn3q8PPtPLZIM/arcgis/rest/services/island_20240509/FeatureServer/0
- Retrieval date: 2026-10-24. Dataset identifier: `island_20240509`; the identifier is not a verified last-update timestamp.
- Used: FCODE identifiers, geographic names, atoll, category, longitude and latitude for 189 Residential Island and 342 Tourism Island records.
- Query: `/query` with `where=category='Residential Island'` or `where=category='Tourism Island'`, `outFields=FCODE,atoll,islandName,category,longitude,latitude`, `orderByFields=FCODE`, `returnGeometry=false`, `f=json`. Both subsets were checked for truncation.
- Stored in: `backend/resources/data/locations.json`.
- Transformations: lowercase FCODE IDs; trim names; DMS coordinates converted to decimal degrees; categories mapped to `residential` and `resort`; unnamed tourism records labelled using source FCODE. Source IDs retained.
- License: https://readme.onemap.mv/pdf/Data%20Usage%20License.pdf . The published license permits reuse with source acknowledgement; the app footer links the source and license and does not imply endorsement.
- Limits: Tourism designation does not confirm an operating resort or commercial brand. Island reference points are not verified harbour boarding locations. Same-named islands can occur in multiple atolls.

## OneMap island outline snapshot

- Publisher, source layer and license: the same official OneMap source and Data Usage License cited above. Retrieved: 2026-10-24; layer identifier `island_20240509` (not a verified last-update date).
- Dataset query endpoint: https://services7.arcgis.com/yvCbn3q8PPtPLZIM/arcgis/rest/services/island_20240509/FeatureServer/0/query
- Used: all 1,560 polygon features from the layer, including uninhabited and other non-bookable island categories. No atoll or maritime boundary geometries are imported.
- Query: `where=1=1`, `outFields=OBJECTID,FCODE,islandName,category`, `orderByFields=OBJECTID`, `returnGeometry=true`, `outSR=4326`, `geometryPrecision=5`, `maxAllowableOffset=0.00002`, `f=geojson`, pages of 500 features. Count and unique OBJECTIDs checked against `returnCountOnly=true`; polygon types and Maldives coordinate bounds validated.
- Stored in: `frontend/public/data/maldives-islands.geojson`; reproducible import: `scripts/import-island-outlines.py`.
- Transformations: ArcGIS projects to WGS84 longitude/latitude, generalizes with a roughly two-metre angular tolerance and rounds to five decimal places; property names normalized, FCODE lowercased. Display uses sand-filled island polygons and teal outlines on a pale ocean background. Directory markers remain separate reference points.
- Attribution: visible OneMap/Geomatics Department credit on both maps; source, retrieval date and license URL retained inside the GeoJSON. Reuse follows the previously recorded OneMap license.
- Limitations: historical coastline snapshot, not a hydrographic chart or current reclamation survey. Source outlines do not establish operating resorts, transport availability, harbour locations or navigable routes. No invented coastlines or circular areas are presented as island geometry.

## OneMap natural reefs and lagoons

- Publisher: Geomatics Department, Ministry of Infrastructure, Housing and Urban Development, Maldives. Official download catalogue: https://readme.onemap.mv/ .
- Source archives: https://readme.onemap.mv/Datashare/Reefs.rar and https://readme.onemap.mv/Datashare/Lagoons.rar . Retrieved 2026-10-24. Included ArcGIS XML metadata shows creation 2022-06-07 and modification 2022-06-19; these are metadata dates, not verified survey or current-condition dates.
- Used: all 2,573 reef polygons and 1,191 lagoon polygons. These are natural geographic features, not administrative atoll borders. Source coverage is not a claim of a complete modern reef survey.
- Stored in: `frontend/public/data/maldives-reefs-lagoons.geojson`; converter: `scripts/import-reef-lagoon-outlines.py`. Original archives are downloaded to temporary storage during conversion. Source archive URLs, counts, CRS, shapefile SHA-256 hashes, retrieval date and license URL are retained in the GeoJSON.
- Transformations: read each `.prj` (WGS84 / UTM zone 43N), repair five invalid lagoon geometries with Shapely `make_valid` and retain polygonal parts, simplify by 10 metres with topology preservation, then project to WGS84 longitude/latitude using `always_xy`. Polygon holes are preserved. Validate all feature counts, geometry validity and Maldives coordinate bounds before saving. Conversion used pyshp 3.1.6, pyproj 3.6.1 and Shapely 2.0.7 in an isolated conversion environment; these are not app runtime dependencies.
- Display: subtle lagoon fill and stronger reef edges below islands and journey lines, on both Leaflet maps. No artificial circular atoll hulls, Google imagery or Google geometries are used.
- License: https://readme.onemap.mv/pdf/Data%20Usage%20License.pdf permits copying, adapting and publishing with attribution and no implication of endorsement. Both maps display OneMap/Geomatics Department attribution and the license link.
- Limitations: historical natural-feature outlines for visual orientation only. No bathymetry, water-depth, reef-condition, tide, navigability or safe-passage conclusions should be drawn. Source gaps and geometry simplification remain; straight demo routes do not avoid reefs or establish safe navigation.

## Maldives CAA land airports

- Publisher: Maldives Civil Aviation Authority.
- Source dataset: https://caa.gov.mv/attachments/RkSqFC1muGxI4GakQ992lPnwqT5gjTxwiat2m7af.pdf
- Source title: List of Land Aerodromes in Maldives. Published update shown: July 2025. Retrieved: 2026-10-24.
- Used: 20 airport names, ICAO/IATA identifiers and airport reference coordinates.
- Stored in: `backend/resources/data/locations.json`.
- Transformations: manually transcribed factual records, normalized name spelling in some labels, DMS coordinates converted to decimal degrees. Airport IDs follow the PDF snapshot.
- Attribution/reuse: source link retained in dataset metadata and app footer. No explicit open-data license was established; do not infer unrestricted republication of the original document.
- Limits: land airports only, excluding seaplane platforms; not a current operational/certification guarantee. Airport reference coordinates are not terminal pickup locations.
- Cross-check consulted: https://caa.gov.mv/operations/air-operations/status-of-certification-of-aerodromes . This page shows Maavarulu as VROM while the PDF uses VRQM. The directory retains the PDF identifier pending reconciliation against current aeronautical publications.

## RTL ferry timetable snapshot

- Publisher: RTL / MTCC.
- Source: https://rtl.mv/#/schedule-details
- Retrieved: 2026-10-24 through the public browser interface; no source revision or validity date was visible in the extracted cards.
- Used: all 27 route cards displayed on that page and 238 displayed time/island entries.
- Stored in: `backend/resources/data/rtl-schedules.json`. User-facing exports: `outputs/rtl-ferry-schedules.json` and `outputs/rtl-ferry-stop-times.csv` in the enclosing task workspace, outside the repository.
- Transformations: extract route codes, titles, zones, listed stops and timetable entries; retain display order and original timetable text. Validate stop membership against route cards. Do not infer trip IDs or operating days.
- Attribution/reuse: publisher and source URL retained. No documented public API, redistribution license, or third-party ticketing agreement was established. Public access alone does not establish those permissions.
- Limits: snapshot of the displayed cards, not a complete RTL network claim. Operating days, validity dates, live disruptions and seat inventory remain unknown. This data does not replace fictional demo schedules or enable real RTL booking.
- Additional official reference consulted: https://mtcc.mv/schedules-2/ . Automated text retrieval returned HTTP 403; no schedule data was imported from that page.

## OpenStreetMap basemap

- Publisher: OpenStreetMap contributors; public tile service operated by the OpenStreetMap Foundation.
- Tile endpoint: https://tile.openstreetmap.org/{z}/{x}/{y}.png
- Copyright/attribution: https://www.openstreetmap.org/copyright
- Tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- First integrated/reviewed: 2026-10-24. Tiles load live in the browser; no fixed dataset version or snapshot retrieval date applies to subsequent map views.
- Historical use (replaced 2026-10-24 by the bundled OneMap outlines above): `frontend/src/app/components/TransportMap.tsx` and `JourneyMap.tsx` used these tiles as background map imagery. No bulk download or offline tile archive is created. Browser caching follows service headers.
- Transformations: display only through Leaflet, with visible OpenStreetMap attribution. The basemap does not supply ferry routes, journey times or vessel positions.
- Limits: best-effort external tile availability; review provider policy/capacity before public deployment. A replacement provider needs its own saved source reference and correct UI attribution.

## Fictional values, not sourced public facts

HV-series ferry schedules, capacities, availability, booking references, simulated cancellations, prices, taxi quotes, five-minute disembarkation, 15-minute taxi drive, and transfer/safety allowances are demo fixtures or configurable product assumptions. Passenger flight/check-in values are user inputs, not official flight feeds. Map route lines are straight illustrations, not sourced navigation paths. Do not attribute these values to OneMap, CAA, RTL or OpenStreetMap.

## Organizer-provided sources — user reference exemption

The user supplied this approved source list on 24 October 2026 and explicitly said additional project references are unnecessary for data from these sources. Preserve this list for future work; do not require duplicate formal source-register entries for organizer-provided data. Retain license-required attribution and keep demo assumptions distinguishable from real data. This exemption does not make a catalogue listing evidence of a dataset's coverage or operational freshness.

- UNCTAD Data Hub: https://unctadstat.unctad.org/datacentre/
- ICAO Country-Pair Traffic: https://unstats.un.org/bigdata/task-teams/ttt-dashboards/icao-country-pair.cshtml
- Transport Data Commons: https://transport-data.org/
- U.S. Department of Transportation Open Data: https://data.transportation.gov/
- Awesome Public Datasets, transportation catalogue: https://github.com/awesomedata/awesome-public-datasets#transportation
- OpenStreetMap: https://www.openstreetmap.org/
- Overpass Turbo: https://overpass-turbo.eu/
- UN Datathon 2024 event/resources: https://unstats.un.org/bigdata/events/2024/un-datathon/
- Maldives Datathon 2026 datasets: https://github.com/mbs-datathon/maldives-datathon-2026-datasets

### Initial relevance check, 24 October 2026

The Maldives Datathon repository README lists release v1.0 packages: MTCC (53 KB), MACL (3.25 MB), Avas Ride (12.79 MB), and FollowMe (440.04 MB). It also lists Team Kandu's 14 team-shared CSV datasets. Package contents have not been inspected or imported. Prioritize inspecting MTCC for ferry-related fields, MACL for airport/flight-related fields, and Avas Ride for taxi-related fields; these are investigation priorities based on the publisher/package names, not verified claims about their contents, geographic coverage, or live availability. FollowMe should only be downloaded if a concrete need justifies its size.

ICAO's linked page is labelled country-pair traffic: treat it as a candidate for broader air-connectivity context, not evidence of domestic flight timetables. The U.S. DOT portal and UN Datathon 2024 page are broad background resources; prioritize Maldives-specific packages for the app. UNCTAD returned HTTP 403 and Transport Data Commons could not be retrieved through the initial text browser, so their contents remain unreviewed. No new data from these candidates has been added to runtime application results.

### Completed organizer dataset inspection — 24 October 2026

This supersedes the earlier note that package contents were uninspected. All three release v1.0 archives (MTCC, MACL, Avas Ride) were downloaded and all tables/CSVs profiled. Detailed findings and package hashes are in `docs/datathon-dataset-review.md`.

MTCC's README states its passenger figures are randomly generated. MACL contains historical movements with anonymous route/carrier codes, not a usable current flight lookup. Avas Ride contains August–September 2026 trips around Greater Malé plus a six-zone fare matrix without currency/validity metadata. These datasets remain outside runtime application results. Raw archives and mobility records are in the task work directory, outside the app repository; only the written assessment is added to docs. No push performed.

## RTL bus routes, fares and displayed origin departures

- Publisher: RTL / MTCC.
- Source: https://rtl.mv/#/busticket , reached from RTL's Travel By Bus control.
- Retrieved: 2026-10-24 through the public browser interface. No source revision, validity dates or service calendar was supplied in the captured views.
- Stored in: `backend/resources/data/rtl-buses.json`.
- Used: 15 Greater Malé route cards (R1–R15), published MVR fares, 184 ordered stop entries, and displayed origin departure lists where available. Each route's stop count, origin, destination and schedule-dialog stop identity were validated against its card. The catalogue includes airport services R3, R4 and R9.
- Transformation: display text normalized to structured route records, fare converted to integer minor units, origin times preserved in source display order and deduplicated. No vehicle identifiers or relative live arrival estimates are displayed by HeyValla. No route geometry or bus stop coordinates were imported.
- Timetable scope: only times visible in each origin's View Schedule popup during retrieval. This may be a rolling upcoming list rather than a full daily timetable; do not infer daily operation or future service dates. Four origins showed no schedules at capture (R10, R11, R12, R15); preserve absence as unavailable rather than cancelled. Recheck these facts against the stored snapshot when refreshing.
- Other coverage: source menus list atoll bus areas as well. Their data has not been imported into this release. Do not imply national completeness.
- Attribution/reuse: source link shown on route cards. No booking integration, documented public API or redistribution license was established. Existing RTL ferry and organizer-dataset notes remain separate.

### Atoll bus expansion — 24 October 2026

The same RTL bus page was checked across all seven atoll areas in its selector. This supersedes the earlier atoll-coverage exclusion. Added 13 routes: DF01 (R.Dhuvaafaru), DH01 (Ha.Dhidhdhoo), FM01 (Fuvahmulah), HMD01/LR01/LR02 (Addu City), IK01/LF01/LG01 (Laamu), KC01/KC02 (Hdh. Kulhudhufushi), and KL01/KN01 (N.Kendhikulhudhoo). Combined catalogue: 28 routes across eight areas.

The 13 additions contain 418 ordered stop entries and 62 displayed origin departures. DF01, KL01 and KN01 showed no origin schedules; absence is not cancellation. LR01, LR02, LF01 and LG01 showed no fare on their cards; stored as null and displayed as unavailable. The other nine cards showed MVR 5. All origins, destinations, stop counts and schedule-dialog origin names were checked against the public UI. Airport labels in FM01, LF01 and LG01 stop lists identify additional airport connections; no transfer timing is inferred.

Storage, transformations, calendar limitations and attribution follow the RTL bus entry above. Route names and stop spellings are retained from RTL. No coordinates, route geometry, live feed or recurring timetable was inferred. This is a dated reference snapshot, not a claim of complete national coverage.


## Maldivian checked flight and fare references

- Publisher: Island Aviation Services Ltd / Maldivian. Source: https://maldivian.aero/ ; official booking engine reached through its search form: https://book.maldivian.aero/ . Manually inspected in the browser on 2026-10-24; reference snapshot recorded at 11:23:38 UTC (16:23:38 Maldives time).
- Search conditions: one-way TMF → MLE; one adult; Maldives nationality selected. Website prices shown in MVR, per traveller including taxes. Not a quote for other nationalities, children, infants or multiple passengers.
- Observed flight detail pages: Q2 183 on 27 October 2026 09:55–10:45, Economy Promo MVR 1,111 (website showed one seat at this fare when checked) and Economy Flex MVR 1,464; Q2 183 on 29 October 21:05–21:55, Economy Flex MVR 1,464; Q2 183 on 31 October 10:20–11:10, Economy Flex MVR 1,464. All times Maldives local time. No tickets or seat holds were created during inspection.
- An initial flexible-date page returned no recommendations for 25 October, but subsequent flight-result calendars showed 27 October. That warning is not treated as proof of no flights on every date in its displayed range. Calendar-only prices for dates without inspected flight details are not imported.
- Stored in: `backend/resources/data/maldivian-flights.json`; four fare references covering three departures. Values transcribed from visible flight results; amounts converted to integer laari, timestamps normalized to explicit UTC+5 offsets and airport IDs matched to the existing CAA directory. Browser session identifiers, tokens and session-specific booking URLs are not retained.
- Coverage: only these checked TMF → MLE dates. No repeating schedule extrapolation. A missing record means unknown coverage, not no service. Search ranks future checked options within ±14 days of the requested date; references older than 24 hours are flagged as older data but remain selectable as planning references, not quotes. Passed departure times are excluded.
- Attribution/reuse: airline name, check timestamp, passenger conditions and official source/checkout link are visible in the app. No public live inventory API or redistribution agreement was established. The sample is a small attributed factual observation; it must not be presented as authorized live inventory or airline endorsement.
- Checkout: user approved continuing to Maldivian for now. HeyValla opens the official homepage in a new tab with instructions to re-enter route, date and full party. No unsupported deep link or prefilled-price promise is made, and no passenger details are transmitted. Airline checkout confirms current seats, rules, eligibility and total price. Clicking the link or saving a reference never marks a flight booked or creates a PNR/e-ticket.
- Official help consulted: https://maldivian.aero/flying-with-us/faq/mobile-and-online-booking.html . Future live integration requires approved airline/distribution access; no browser challenge or session mechanism is bypassed. Do not use old promotional news prices as current fares.

### Submission booking simulation (24 October 2026)

No new public dataset was added for demo checkout. It reuses the registered Maldivian references, organizer-provided Avas Ride matrix and RTL bus snapshot. Multiplication of a checked adult flight price, four-seat taxi capacity, MVR 80 Thimarafushi transfer and MVR 1,464 manual flight fare are explicitly **simulation assumptions**, not published supplier quotes. Owner cargo updates and optional vessel positions are self-reported demo inputs with timestamps; no FollowMe data is fetched. Planned integrations shown in the app do not imply provider endorsement or live API access.

### Flightless route demonstration (24 October 2026)

`backend/config/demo_sea_routes.php` contains fictional daily fixtures, not RTL timetables. The user supplied the example Kinbidhoo–Veymandoo 10:00–10:05 and Veymandoo–Laamu Gan 10:30–12:00. Fares (MVR 25 and 150), the return example and Vilufushi–Malé launch (MVR 350) are invented demonstration values. Canonical islands and map points reuse the registered location directory. Owner-published dated sailings retain their separate provider/demo status. No new public dataset was imported; no service availability is inferred from geography alone.
