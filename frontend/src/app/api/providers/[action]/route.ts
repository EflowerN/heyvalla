import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/operator-session";
const methods: Record<string, string[]> = { operations: ["POST"], register: ["POST"], login: ["POST"], account: ["GET", "POST", "DELETE"], requests: ["GET", "POST"], publishing: ["GET"], vessels: ["POST"], sailings: ["POST"], publish: ["POST"], catalogue: ["GET"] };
async function proxy(request: Request, context: RouteContext<"/api/providers/[action]">) {
  const { action } = await context.params;
  if (!methods[action]?.includes(request.method)) return Response.json({ message: "Not found." }, { status: 404 });
  if (request.method !== "GET" && !sameOrigin(request)) return Response.json({ message: "Please submit from HeyValla." }, { status: 403 });
  const jar = await cookies();
  const token = jar.get("heyvalla_provider")?.value;
  if (!["register", "login", "catalogue"].includes(action) && !token) return Response.json({ message: "Provider sign-in required." }, { status: 401 });
  try {
    const response = await fetch(`${process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000"}/api/v1/providers/${action}`, { method: request.method, headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: request.method === "POST" ? JSON.stringify(await request.json()) : undefined, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (response.status >= 500) throw new Error();
    const data = await response.json();
    if (response.ok && data.token) {
      jar.set("heyvalla_provider", data.token, { httpOnly: true, sameSite: "strict", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 8 * 3600 });
      delete data.token;
    }
    if (request.method === "DELETE" && response.ok) jar.delete("heyvalla_provider");
    return Response.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ message: "Provider service unavailable. Refresh to check the result before retrying." }, { status: 503 }); }
}
export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
