# Development notes

The foundation uses Next.js 16.4.3, React 19.3.0, and Laravel 13 (exact versions are recorded in package-lock.json and composer.lock). PHP 8.4 and Node 24 were used during setup.

Next.js uses Webpack for local development and production builds, with Tailwind's PostCSS integration. The default Turbopack build could not start its CSS worker process in the setup environment. No remote fonts are needed to build the app.

The health endpoint is intentionally public and returns only application metadata. The initial Laravel `/api/health` route lives in `routes/web.php`; future product API routes should be registered separately with versioning, authentication, and authorization as appropriate. Next.js calls the endpoint server-side through `/api/backend-health`; no CORS configuration is needed for this check. The backend URL is a server-only environment variable.

Authentication and the operator dashboard are not scaffolded yet. Laravel's default welcome route and migrations remain available. Laravel's Vite files are starter assets; the product UI is in Next.js, so backend npm installation is not needed for this setup.

Local `.env` files, application keys, installed dependencies, build outputs, and the SQLite database are ignored by Git. Never commit these files. Use the environment examples and lockfiles to reproduce the setup.

## Location directory

`backend/resources/data/locations.json` is a committed source snapshot retrieved on 24 October 2026. It contains all 189 records classified as `Residential Island` by the public OneMap Island layer (`island_20240509`), and 20 land airports from the Maldives CAA list updated July 2025. The catalogue does not include seaplane platforms. Source metadata and links are included in the data file and UI. It is a directory snapshot, not proof of current airport operations or transport availability.

Island data is attributed to the Geomatics Department, Ministry of Infrastructure, Housing and Urban Development, under its Data Usage License: https://readme.onemap.mv/pdf/Data%20Usage%20License.pdf . Official API documentation: https://readme.onemap.mv/ . Residential records were queried with `where=category='Residential Island'`, `outFields=FCODE,atoll,islandName,category`, `orderByFields=FCODE`, `returnGeometry=false`, `f=json`; the complete response contained 189 records and no transfer-limit flag. Stable source FCODE identifiers distinguish islands sharing a name. Official spellings are retained, including `Veymandoo` for the existing Thaa demo origin; `MLE` is OneMap's Malé City grouping.

Airport names and IATA/ICAO identifiers come from https://caa.gov.mv/attachments/RkSqFC1muGxI4GakQ992lPnwqT5gjTxwiat2m7af.pdf . Identifiers follow that snapshot (for example Maavarulu is VRQM there, while the CAA certification page shows VROM); reconcile against current aeronautical publications before any operational integration. No certification or active-service claim is made.

Refresh the snapshot by retrieving the residential query, confirming it is not truncated, checking duplicate IDs and category changes, and reviewing CAA's current list for additions/renames. Update attribution and retrieval metadata alongside changes. Tests check directory counts and unique identifiers; revise reviewed counts when the official source changes.

`GET /api/v1/islands` returns both island and airport options. Ferry search now requires `airport` in addition to the origin and flight inputs. Demo schedules cover only Thaa Vilufushi (LD0205), Veymandoo (LD0694), and Guraidhoo (LD1163) to Thimarafushi (VRNT). Other valid pairs return an empty result with `schedule_coverage=false` and no transfer allowance. They do not reuse Thimarafushi's travel times or fabricate ferry routes.

## Interactive map

The embedded Leaflet map displays all directory islands and airports, plus three fictional origin-to-Thimarafushi connections. Coordinates use the official OneMap longitude/latitude fields converted from DMS to decimal degrees, and airport reference coordinates from the CAA July 2025 list. Island markers represent reference locations, not verified harbour boarding points. Airport reference points are not terminal entrances. The route lines are straight illustrations between reference points, not navigation tracks or verified RTL routes.

Layer toggles control islands, airports, and demo lines. Country and selected-journey controls fit the map bounds; the form's origin and airport drive the selected-journey view. Existing text search/results remain available outside the map. Popups use text nodes for source names. Map data comes from the Laravel directory endpoint; Leaflet loads only in the browser.

OpenStreetMap background tiles load directly in the browser with visible attribution and normal browser caching. No offline tile prefetch is implemented. `NEXT_PUBLIC_MAP_TILE_URL` can select a compatible tile endpoint at build time; the current attribution is for OpenStreetMap, so update it if changing provider. Review tile-provider usage terms and capacity before public deployment. The map reports tile failures while retaining reference markers.

## Resort islands and map selection

The directory also includes all 342 records classified `Tourism Island` in the same OneMap layer, retrieved with the documented residential query parameters but `where=category='Tourism Island'`. The response was not truncated. They are stored with `category=resort`; the 189 residential records use `category=residential`. Tourism designation does not establish that a resort is currently operating, nor provide its commercial brand name. Geographic names and coordinates are retained, with source attribution unchanged.

Purple map dots and a separate Resorts layer distinguish these entries. All 531 island records are valid departure options. A click on an island sets the form origin and clears the island text filter; an airport click sets the destination. Either change clears previous search results and errors. Dates and check-in settings stay intact. The map retains its current view when selecting a marker or toggling a layer. Resort destinations do not receive invented transport schedules.
