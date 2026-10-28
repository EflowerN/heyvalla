export function isDhathuruBackend(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const health = data as Record<string, unknown>;
  return health.status === "ok" && health.application === "Dhathuru App" && health.service_id === "dhathuru-api" && health.service_timezone === "Indian/Maldives";
}
