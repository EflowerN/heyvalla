export async function GET() {
  try {
    const response = await fetch(`${process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000"}/api/v1/rtl-buses`, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error();
    return Response.json(await response.json());
  } catch { return Response.json({ message: "Bus routes could not be loaded. Please retry." }, { status: 503 }); }
}
