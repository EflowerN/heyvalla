/** Keep a retry key through reloads without storing passenger details. */
export async function bookingKey(payload: object) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
  const storageKey = "heyvalla-request-" + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
  const id = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
  sessionStorage.setItem(storageKey, id);
  return { id, clear: () => sessionStorage.removeItem(storageKey) };
}
