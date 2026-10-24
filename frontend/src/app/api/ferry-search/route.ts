export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const key of ["island", "airport", "flight_date", "flight_time", "check_in_minutes"]) {
    const value = query.get(key);
    if (value !== null) params.set(key, value);
  }
  try {
    const response = await fetch(`${process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000"}/api/v1/ferry-search?${params}`, {
      cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok && response.status !== 422) throw new Error("Search unavailable");
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ message: "Ferry search is unavailable. Please try again shortly." }, { status: 503 });
  }
}
