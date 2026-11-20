import { DomainError } from "./errors";

/** Version B money rules. See docs/PLAN.md. Amounts are integer cents of MUR. */
export const CURRENCY = "MUR" as const;
export const COMMISSION_BPS = 1500;
export const MIN_PRICE_PER_SEAT_CENTS = 5_000;
export const MAX_PRICE_PER_SEAT_CENTS = 200_000;
export const MAX_SEATS_PER_BOOKING = 4;
export const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000;
export const MIN_LEAD_MS = 30 * 60 * 1000;
export const COMPLETE_EARLY_MS = 15 * 60 * 1000;

export type Quote = {
  seats: number;
  pricePerSeatCents: number;
  fareCents: number;
  commissionCents: number;
  driverNetCents: number;
  currency: typeof CURRENCY;
};

export type LedgerAccount = "platform_cash" | "platform_commission" | "driver_payable";

export type LedgerLine = {
  account: LedgerAccount;
  amountCents: number;
  memo: string;
};

export function quoteFare(seats: number, pricePerSeatCents: number): Quote {
  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS_PER_BOOKING) {
    throw new DomainError("INVALID_SEATS");
  }
  if (
    !Number.isInteger(pricePerSeatCents) ||
    pricePerSeatCents < MIN_PRICE_PER_SEAT_CENTS ||
    pricePerSeatCents > MAX_PRICE_PER_SEAT_CENTS
  ) {
    throw new DomainError("INVALID_PRICE");
  }
  const fareCents = seats * pricePerSeatCents;
  const commissionCents = Math.floor((fareCents * COMMISSION_BPS) / 10_000);
  const driverNetCents = fareCents - commissionCents;
  return {
    seats,
    pricePerSeatCents,
    fareCents,
    commissionCents,
    driverNetCents,
    currency: CURRENCY,
  };
}

export function captureLines(quote: Quote): LedgerLine[] {
  return [
    { account: "platform_cash", amountCents: quote.fareCents, memo: "Passenger fare captured (TEST)" },
    { account: "platform_commission", amountCents: quote.commissionCents, memo: "Platform commission" },
    { account: "driver_payable", amountCents: quote.driverNetCents, memo: "Driver payable" },
  ];
}

export function refundLines(quote: Quote): LedgerLine[] {
  return captureLines(quote).map((line) => ({
    ...line,
    amountCents: -line.amountCents,
    memo: `Reversal: ${line.memo}`,
  }));
}

export function sumAccount(lines: LedgerLine[], account: LedgerAccount): number {
  return lines.filter((line) => line.account === account).reduce((sum, line) => sum + line.amountCents, 0);
}

export function ledgerBalanced(lines: LedgerLine[]): boolean {
  return sumAccount(lines, "platform_cash") === sumAccount(lines, "platform_commission") + sumAccount(lines, "driver_payable");
}

export function rupeesToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [major, minor = ""] = trimmed.split(".");
  const cents = Number(major) * 100 + Number(minor.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

export function formatMur(cents: number, locale: "en" | "fr"): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const major = Math.floor(abs / 100);
  const minor = abs % 100;
  const grouped = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, locale === "fr" ? "\u202f" : ",");
  const sep = locale === "fr" ? "," : ".";
  return `${negative ? "-" : ""}Rs ${grouped}${sep}${minor.toString().padStart(2, "0")}`;
}

export function passengerMayCancel(now: Date, departureIso: string): boolean {
  return new Date(departureIso).getTime() - now.getTime() >= CANCEL_CUTOFF_MS;
}

export function driverMayComplete(now: Date, departureIso: string): boolean {
  return now.getTime() >= new Date(departureIso).getTime() - COMPLETE_EARLY_MS;
}

const SUCCESS_PAN = "4242424242424242";
const DECLINE_PAN = "4000000000000002";

export function judgeTestCard(input: { pan: string; expiry: string; cvc: string }):
  | { ok: true; status: "captured" | "declined"; last4: string }
  | { ok: false; code: "NOT_A_TEST_CARD" | "BAD_EXPIRY" | "BAD_CVC" } {
  const pan = input.pan.replace(/[\s-]/g, "");
  const expiry = input.expiry.replace(/\s/g, "");
  const cvc = input.cvc.trim();
  if (pan !== SUCCESS_PAN && pan !== DECLINE_PAN) return { ok: false, code: "NOT_A_TEST_CARD" };
  if (expiry !== "12/34") return { ok: false, code: "BAD_EXPIRY" };
  if (cvc !== "123") return { ok: false, code: "BAD_CVC" };
  if (pan === DECLINE_PAN) return { ok: true, status: "declined", last4: "0002" };
  return { ok: true, status: "captured", last4: "4242" };
}
