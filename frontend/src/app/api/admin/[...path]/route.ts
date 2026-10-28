import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/request-origin";

const allowed = /^(users|users\/\d{1,12}|audit)$/;

async function proxy(request: Request, context: RouteContext<"/api/admin/[...path]">) {
  const { path } = await context.params;
  const route = path.join("/");
  if (!allowed.test(route)) return Response.json({ message: "Not found." }, { status: 404 });
  if (request.method === "POST" && !sameOrigin(request)) return Response.json({ message: "Please submit from Dhathuru App." }, { status: 403 });
  const session = (await cookies()).get("dhathuru_session")?.value;
  if (!session || !/^[A-Za-z0-9]{64}$/.test(session)) return Response.json({ message: "Sign in to continue." }, { status: 401 });
  try {
    const query = request.method === "GET" ? new URL(request.url).search : "";
    const response = await fetch(`${process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000"}/api/v1/admin/${route}${query}`, {
      method: request.method, cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${session}` },
      body: request.method === "POST" ? JSON.stringify(await request.json()) : undefined,
    });
    if (response.status >= 500) throw new Error("backend");
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "The admin service is unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export const GET = proxy;
export const POST = proxy;
