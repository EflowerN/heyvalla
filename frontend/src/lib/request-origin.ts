export function sameOrigin(request: Request) {
  try { return new URL(request.headers.get("origin") ?? "").host === request.headers.get("host"); } catch { return false; }
}
