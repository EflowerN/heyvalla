export function maldivesDate(value: string | number = Date.now()): string {
  return new Date(new Date(value).getTime() + 5 * 3600_000).toISOString().slice(0, 10);
}
