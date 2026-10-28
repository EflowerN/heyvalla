import { cookies, headers } from "next/headers";

export const backendUrl = (process.env.LARAVEL_API_URL ?? "http://127.0.0.1:18765").replace(/\/$/, "");

export async function guestHeaders(): Promise<Record<string, string>> {
  const jar = await cookies();
  let guest = jar.get("heyvalla_demo_guest")?.value;
  if (!guest || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guest)) {
    guest = crypto.randomUUID();
    const requestHeaders = await headers();
    jar.set("heyvalla_demo_guest", guest, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && (process.env.VERCEL === "1" || requestHeaders.get("x-forwarded-proto") === "https"), path: "/", maxAge: 30 * 24 * 3600 });
  }
  return { Accept: "application/json", "X-Demo-Guest": guest };
}

export function proxyHeaders(response: Response): Record<string, string> {
  const retry = response.headers.get("Retry-After");
  return { "Cache-Control": "no-store", ...(retry ? { "Retry-After": retry } : {}) };
}
