import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { operatorAllowed, sameOrigin, signSession } from "@/lib/operator-session";

const attempts = new Map<string, { count: number; reset: number }>();
export async function GET() { return Response.json({ authenticated: await operatorAllowed() }, { headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Invalid request origin." }, { status: 403 });
  const key = request.headers.get("host") ?? "local";
  const entry = attempts.get(key);
  if (entry && entry.reset > Date.now() && entry.count >= 10) return Response.json({ message: "Too many attempts. Try again in a minute." }, { status: 429 });
  attempts.set(key, { count: entry && entry.reset > Date.now() ? entry.count + 1 : 1, reset: entry && entry.reset > Date.now() ? entry.reset : Date.now() + 60000 });
  const expected = process.env.DEMO_OPERATOR_PASSWORD;
  if (!expected || !process.env.DEMO_OPERATOR_TOKEN) return Response.json({ message: "Operator login is not configured." }, { status: 503 });
  const body = await request.json();
  const provided = Buffer.from(typeof body.password === "string" ? body.password : "");
  const actual = Buffer.from(expected);
  if (provided.length !== actual.length || !timingSafeEqual(provided, actual)) return Response.json({ message: "Incorrect demo operator password." }, { status: 401 });
  const expiry = String(Date.now() + 8 * 60 * 60 * 1000);
  (await cookies()).set("heyvalla_operator", `${expiry}.${signSession(expiry)}`, { httpOnly: true, sameSite: "strict", secure: request.headers.get("origin")?.startsWith("https:"), path: "/", maxAge: 8 * 60 * 60 });
  return Response.json({ authenticated: true });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ message: "Invalid request origin." }, { status: 403 });
  (await cookies()).delete("heyvalla_operator"); return Response.json({ authenticated: false });
}
