import { backendUrl, guestHeaders, proxyHeaders } from "@/lib/backend";
export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/api/v1/rtl-buses`, { cache: "no-store", headers: await guestHeaders(), signal: AbortSignal.timeout(5000) });
    if (response.status >= 500) throw new Error();
    return Response.json(await response.json(), { status: response.status, headers: proxyHeaders(response) });
  } catch { return Response.json({ message: "Bus routes could not be loaded. Please retry." }, { status: 503 }); }
}
