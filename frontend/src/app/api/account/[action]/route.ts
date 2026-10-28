import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/request-origin";

const GUEST = "heyvalla_demo_guest";
const SESSION = "dhathuru_session";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const methods: Record<string, string> = { login: "POST", signup: "POST", logout: "POST", me: "GET" };
const backend = () => process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000";

async function proxy(request: Request, context: RouteContext<"/api/account/[action]">) {
  const { action } = await context.params;
  if (methods[action] !== request.method) return Response.json({ message: "Not found." }, { status: 404 });
  if (request.method === "POST" && !sameOrigin(request)) return Response.json({ message: "Please submit from Dhathuru App." }, { status: 403 });
  const jar = await cookies();
  const secure = new URL(request.url).protocol === "https:";
  const setCookie = (name: string, value: string, maxAge: number) => jar.set(name, value, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge });
  const current = jar.get(GUEST)?.value;
  const guest = current && uuid.test(current) ? current : null;
  const session = jar.get(SESSION)?.value;
  const token = session && /^[A-Za-z0-9]{64}$/.test(session) ? session : null;

  if (action === "me" && !token) return Response.json({ account: null }, { headers: { "Cache-Control": "no-store" } });
  try {
    const response = await fetch(`${backend()}/api/v1/travellers/${action === "signup" ? "register" : action}`, {
      method: request.method, cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json", "Content-Type": "application/json", ...(guest ? { "X-Demo-Guest": guest } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: request.method === "POST" && action !== "logout" ? JSON.stringify(await request.json()) : undefined,
    });
    if (response.status >= 500) throw new Error("backend");
    // Signing out also hands the browser a fresh anonymous identity.
    if (action === "logout") { jar.delete(SESSION); setCookie(GUEST, crypto.randomUUID(), 60 * 60 * 24 * 30); return Response.json({ account: null }, { headers: { "Cache-Control": "no-store" } }); }
    const data = await response.json();
    if (response.ok && typeof data.guest === "string" && uuid.test(data.guest)) setCookie(GUEST, data.guest, 60 * 60 * 24 * 30);
    if (response.ok && typeof data.token === "string" && /^[A-Za-z0-9]{64}$/.test(data.token)) setCookie(SESSION, data.token, 60 * 60 * 24 * 7);
    delete data.guest; delete data.token;
    // A rejected or expired session should not linger in the browser.
    if (action === "me" && !data.account) jar.delete(SESSION);
    return Response.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Accounts are unavailable right now. Please try again in a moment." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export const GET = proxy;
export const POST = proxy;
