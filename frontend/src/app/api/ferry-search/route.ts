import { backendUrl, guestHeaders, proxyHeaders } from "@/lib/backend";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const key of ["island", "airport", "flight_date", "flight_time", "check_in_minutes"]) {
    const value = query.get(key);
    if (value !== null) params.set(key, value);
  }
  try {
    const response = await fetch(`${backendUrl}/api/v1/ferry-search?${params}`, {
      cache: "no-store", headers: await guestHeaders(), signal: AbortSignal.timeout(5000),
    });
    if (response.status >= 500) throw new Error("Search unavailable");
    return Response.json(await response.json(), { status: response.status, headers: proxyHeaders(response) });
  } catch {
    return Response.json({ message: "Ferry search is unavailable. Please try again shortly." }, { status: 503 });
  }
}
