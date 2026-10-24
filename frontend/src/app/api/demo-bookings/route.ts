import { cookies } from "next/headers";

async function proxy(request: Request, method: "GET" | "POST" | "DELETE") {
  if (method !== "GET" && (request.headers.get("origin") === null || new URL(request.headers.get("origin")!).host !== request.headers.get("host"))) {
    return Response.json({ message: "Please submit bookings from this app." }, { status: 403 });
  }
  const jar = await cookies();
  const guest = jar.get("heyvalla_demo_guest")?.value ?? crypto.randomUUID();
  if (!jar.has("heyvalla_demo_guest")) jar.set("heyvalla_demo_guest", guest, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && new URL(request.url).protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 30 });
  try {
    const body = method !== "GET" ? await request.json() : undefined;
    const response = await fetch(`${process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000"}/api/v1/demo-bookings${method === "DELETE" ? "/cancel" : ""}`, {
      method: method === "DELETE" ? "POST" : method, cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json", "X-Demo-Guest": guest },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
    });
    if (response.status >= 500) throw new Error("Backend unavailable");
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Could not confirm the result. Retry with the same details to avoid duplicate bookings." }, { status: 503 });
  }
}
export async function GET(request: Request) { return proxy(request, "GET"); }
export async function POST(request: Request) { return proxy(request, "POST"); }

export async function DELETE(request: Request) { return proxy(request, "DELETE"); }
