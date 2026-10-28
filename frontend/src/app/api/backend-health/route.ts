import { isDhathuruBackend } from "@/lib/backend-health";
import { backendUrl, guestHeaders } from "@/lib/backend";
export async function GET() {
  const baseUrl = backendUrl;

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: await guestHeaders(),
    });
    if (!response.ok) throw new Error("Backend health check failed");
    const data = await response.json();
    if (!isDhathuruBackend(data)) {
      return Response.json({ frontend: "ok", backend: "wrong-application", message: "The configured backend is not the Dhathuru App API. Check LARAVEL_API_URL." }, { status: 503 });
    }
    return Response.json({ frontend: "ok", backend: data });
  } catch {
    return Response.json(
      { frontend: "ok", backend: "unavailable", message: "Start the Laravel API and check LARAVEL_API_URL." },
      { status: 503 },
    );
  }
}
