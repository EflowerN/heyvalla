import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export function sameOrigin(request: Request) {
  try { return new URL(request.headers.get("origin") ?? "").host === request.headers.get("host"); } catch { return false; }
}
export function signSession(expiry: string) {
  const secret = process.env.DEMO_OPERATOR_TOKEN;
  if (!secret || secret.length < 32) throw new Error("Operator access is not configured.");
  return createHmac("sha256", secret).update(`operator:${expiry}`).digest("hex");
}
export async function operatorAllowed() {
  const token = (await cookies()).get("heyvalla_operator")?.value;
  if (!token) return false;
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature || !/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;
  try { const expected = Buffer.from(signSession(expiry)); const actual = Buffer.from(signature); return expected.length === actual.length && timingSafeEqual(expected, actual); } catch { return false; }
}
