export default function Footer({ residential, resorts, airports }: { residential: number; resorts: number; airports: number }) {
  return (
    <footer className="mt-10 border-t border-ocean/10 pt-5 text-xs leading-6 text-ocean/70">
      <p>
        Island data: <a href="https://readme.onemap.mv/" className="underline">Geomatics Department, Ministry of Infrastructure, Housing and Urban Development (OneMap)</a>, under its <a href="https://readme.onemap.mv/pdf/Data%20Usage%20License.pdf" className="underline">Data Usage License</a>.
        Airports: <a href="https://caa.gov.mv/attachments/RkSqFC1muGxI4GakQ992lPnwqT5gjTxwiat2m7af.pdf" className="underline">Maldives CAA land-aerodrome list (July 2025)</a>. No official endorsement.
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer font-medium text-lagoon">More about this data</summary>
        <p className="mt-2">
          Directory: {residential || "…"} residential islands, {resorts || "…"} tourism/resort islands and {airports || "…"} land airports.
          Directory retrieved 24 October 2026; inclusion does not confirm current operations or ferry service. Seaplane platforms are outside this land-airport directory.
        </p>
      </details>
    </footer>
  );
}
