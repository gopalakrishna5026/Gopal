export function uid(): string {
  return crypto.randomUUID();
}

function randomDigits(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => (b % 10).toString()).join("");
}

/** Simulated 10-digit PNR. First digit is never 0. Uniqueness is enforced by the DB index. */
export function generatePnr(): string {
  return `${(crypto.getRandomValues(new Uint8Array(1))[0] % 9) + 1}${randomDigits(9)}`;
}

export function generateBookingId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  return `RY${stamp}${randomDigits(3)}`;
}

export function generatePaymentReference(): string {
  return `TXN${Date.now()}${randomDigits(4)}`;
}

/** Small deterministic string hash (FNV-1a) used for mock availability. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
