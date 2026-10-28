import { backendUrl, guestHeaders, proxyHeaders } from "@/lib/backend";
export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["from", "to"]) if (search.has(key)) query.set(key, search.get(key)!);
  try {
    const response = await fetch(`${backendUrl}/api/v1/greater-male-fares?${query}`, { cache: "no-store", headers: await guestHeaders(), signal: AbortSignal.timeout(5000) });
    if (response.status >= 500) throw new Error();
    return Response.json(await response.json(), { status: response.status, headers: proxyHeaders(response) });
  } catch { return Response.json({ message: "Fare estimator is unavailable. Please retry." }, { status: 503 }); }
}
