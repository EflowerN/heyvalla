export async function GET() {
  const baseUrl = process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Backend health check failed");
    const data = await response.json();
    return Response.json({ frontend: "ok", backend: data });
  } catch {
    return Response.json(
      { frontend: "ok", backend: "unavailable", message: "Start the Laravel API and check LARAVEL_API_URL." },
      { status: 503 },
    );
  }
}
