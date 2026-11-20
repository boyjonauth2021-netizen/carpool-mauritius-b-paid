const PEPPER = "carpool-mauritius-b\0";

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(PEPPER + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
