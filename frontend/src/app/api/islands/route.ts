import { backendUrl, guestHeaders, proxyHeaders } from "@/lib/backend";
export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/api/v1/islands`, {
      cache: "no-store", headers: await guestHeaders(), signal: AbortSignal.timeout(5000),
    });
    if (response.status >= 500) throw new Error("Islands unavailable");
    return Response.json(await response.json(), { status: response.status, headers: proxyHeaders(response) });
  } catch {
    return Response.json({ message: "Could not load departure islands. Please reload to try again." }, { status: 503 });
  }
}
