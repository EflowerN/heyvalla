import { operatorAllowed, sameOrigin } from "@/lib/operator-session";
async function proxy(request: Request, method: string) {
  if (!await operatorAllowed()) return Response.json({ message: "Operator login required." }, { status: 401 });
  if (method !== "GET" && !sameOrigin(request)) return Response.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const response = await fetch(`${process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000"}/api/v1/operator/taxis`, { method, cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json", "X-Demo-Operator": process.env.DEMO_OPERATOR_TOKEN! }, body: method === "POST" ? JSON.stringify(await request.json()) : undefined, signal: AbortSignal.timeout(10000) });
    if (response.status >= 500) throw new Error();
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ message: "Operator service is unavailable. Refresh before retrying." }, { status: 503 }); }
}
export async function GET(request: Request) { return proxy(request, "GET"); }
export async function POST(request: Request) { return proxy(request, "POST"); }
