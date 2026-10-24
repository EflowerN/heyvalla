export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["from", "to"]) if (search.has(key)) query.set(key, search.get(key)!);
  try {
    const response = await fetch(`${process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000"}/api/v1/greater-male-fares?${query}`, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!response.ok && response.status !== 422) throw new Error();
    return Response.json(await response.json(), { status: response.status });
  } catch { return Response.json({ message: "Fare estimator is unavailable. Please retry." }, { status: 503 }); }
}
