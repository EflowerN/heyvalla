export async function GET() {
  try {
    const response = await fetch(`${process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000"}/api/v1/islands`, {
      cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Islands unavailable");
    return Response.json(await response.json());
  } catch {
    return Response.json({ message: "Could not load departure islands. Please reload to try again." }, { status: 503 });
  }
}
