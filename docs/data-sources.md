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
- Used in: `frontend/src/app/components/TransportMap.tsx` as background map imagery. No bulk download or offline tile archive is created. Browser caching follows service headers.
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
