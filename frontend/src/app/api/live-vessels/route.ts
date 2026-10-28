import { backendUrl, guestHeaders, proxyHeaders } from "@/lib/backend";

export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/api/v1/live-vessels`, {
      cache: "no-store", headers: await guestHeaders(), signal: AbortSignal.timeout(10000),
    });
    if (response.status >= 500) throw new Error();
    return Response.json(await response.json(), { status: response.status, headers: proxyHeaders(response) });
  } catch {
    return Response.json({ status: "unavailable", vessels: [], message: "Live boat tracking could not be reached. Your journey planner is still available." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
