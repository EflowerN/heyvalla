import { backendUrl, guestHeaders, proxyHeaders } from "@/lib/backend";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const key of ["from", "to", "date", "fare_profile"]) {
    const value = query.get(key);
    if (value !== null) params.set(key, value);
  }
  try {
    const response = await fetch(`${backendUrl}/api/v1/flights?${params}`, {
      cache: "no-store", headers: await guestHeaders(), signal: AbortSignal.timeout(5000),
    });
    if (response.status >= 500) throw new Error("Flight search unavailable");
    return Response.json(await response.json(), { status: response.status, headers: proxyHeaders(response) });
  } catch {
    return Response.json({ message: "Checked flight options could not load. Try again or check Maldivian directly." }, { status: 503 });
  }
}
