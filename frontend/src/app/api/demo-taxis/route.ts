import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/operator-session";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Invalid request origin." }, { status: 403 });
  const guest = (await cookies()).get("heyvalla_demo_guest")?.value;
  if (!guest) return Response.json({ message: "Load your ferry bookings first." }, { status: 401 });
  try {
    const body = await request.json();
    const action = body.action === "accept" ? "/accept" : body.action === "cancel" ? "/cancel" : "";
    const response = await fetch(`${process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000"}/api/v1/demo-taxis${action}`, { method: "POST", cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json", "X-Demo-Guest": guest }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    if (response.status >= 500) throw new Error();
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ message: "Could not confirm the update. Refresh your bookings before retrying." }, { status: 503 }); }
}
