import { describe, expect, it } from "vitest";
import {
  captureLines,
  formatMur,
  judgeTestCard,
  ledgerBalanced,
  passengerMayCancel,
  quoteFare,
  refundLines,
  rupeesToCents,
  sumAccount,
} from "./money";

describe("quoteFare", () => {
  it("takes 15% off the driver, rounded down to the cent", () => {
    const quote = quoteFare(1, 12_000);
    expect(quote.fareCents).toBe(12_000);
    expect(quote.commissionCents).toBe(1_800);
    expect(quote.driverNetCents).toBe(10_200);
    expect(quote.fareCents).toBe(quote.commissionCents + quote.driverNetCents);
  });

  it("scales with seats and floors a remainder", () => {
    const three = quoteFare(3, 12_000);
    expect(three.fareCents).toBe(36_000);
    expect(three.commissionCents).toBe(5_400);
    const awkward = quoteFare(1, 5_001);
    expect(awkward.commissionCents).toBe(750);
    expect(awkward.driverNetCents).toBe(4_251);
  });

  it("rejects seats and prices outside the rules", () => {
    expect(() => quoteFare(0, 5_000)).toThrow(/INVALID_SEATS/);
    expect(() => quoteFare(5, 5_000)).toThrow(/INVALID_SEATS/);
    expect(() => quoteFare(1, 4_999)).toThrow(/INVALID_PRICE/);
    expect(() => quoteFare(1, 200_001)).toThrow(/INVALID_PRICE/);
    expect(() => quoteFare(1.5, 5_000)).toThrow(/INVALID_SEATS/);
  });
});

describe("ledger", () => {
  it("balances on capture and returns to zero on refund", () => {
    const quote = quoteFare(2, 5_001);
    const captured = captureLines(quote);
    expect(ledgerBalanced(captured)).toBe(true);
    expect(sumAccount(captured, "platform_cash")).toBe(quote.fareCents);
    const both = [...captured, ...refundLines(quote)];
    expect(ledgerBalanced(both)).toBe(true);
    expect(sumAccount(both, "platform_cash")).toBe(0);
    expect(sumAccount(both, "platform_commission")).toBe(0);
    expect(sumAccount(both, "driver_payable")).toBe(0);
  });
});

describe("rupees and display", () => {
  it("parses rupees and formats both languages", () => {
    expect(rupeesToCents("120")).toBe(12_000);
    expect(rupeesToCents("50.5")).toBe(5_050);
    expect(rupeesToCents("50.555")).toBeNull();
    expect(formatMur(12_000, "en")).toBe("Rs 120.00");
    expect(formatMur(12_000, "fr")).toBe("Rs 120,00");
    expect(formatMur(123_456, "en")).toBe("Rs 1,234.56");
  });
});

describe("test cards", () => {
  it("accepts only the two documented test cards", () => {
    expect(judgeTestCard({ pan: "4242 4242 4242 4242", expiry: "12/34", cvc: "123" })).toEqual({
      ok: true,
      status: "captured",
      last4: "4242",
    });
    expect(judgeTestCard({ pan: "4000000000000002", expiry: "12/34", cvc: "123" }).ok).toBe(true);
    const real = judgeTestCard({ pan: "4111111111111111", expiry: "12/34", cvc: "123" });
    expect(real).toEqual({ ok: false, code: "NOT_A_TEST_CARD" });
    expect(JSON.stringify(real)).not.toContain("1111");
    expect(judgeTestCard({ pan: "4242424242424242", expiry: "01/30", cvc: "123" }).ok).toBe(false);
    expect(judgeTestCard({ pan: "4242424242424242", expiry: "12/34", cvc: "999" }).ok).toBe(false);
  });
});

describe("cancellation window", () => {
  it("allows a full refund at least two hours before departure", () => {
    const departure = "2026-11-21T07:30:00.000Z";
    expect(passengerMayCancel(new Date("2026-11-21T05:30:00.000Z"), departure)).toBe(true);
    expect(passengerMayCancel(new Date("2026-11-21T05:30:01.000Z"), departure)).toBe(false);
  });
});
