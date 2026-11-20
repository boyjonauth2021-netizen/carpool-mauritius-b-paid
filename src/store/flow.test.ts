import { describe, expect, it } from "vitest";
import { ledgerBalanced, sumAccount } from "@/domain/money";
import { hashPassword } from "@/services/hash";
import { resolveAdapters } from "@/services/adapters";
import {
  bookRide,
  cancelBookingByPassenger,
  cancelRideByDriver,
  completeRide,
  login,
  payBooking,
  postRide,
  register,
  requestPhoneCode,
  reviewDriver,
  searchRides,
  submitDriver,
  verifyEmail,
  verifyPhone,
} from "./actions";
import { createSeedState, DEMO_PASSWORD } from "./seed";

const adapters = resolveAdapters({});
const now = new Date("2026-11-20T06:00:00Z");

async function demo() {
  const state = await createSeedState(now);
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  return { state, passwordHash };
}

function lines(state: { ledger: { account: "platform_cash" | "platform_commission" | "driver_payable"; amountCents: number; memo: string }[] }) {
  return state.ledger.map((entry) => ({ account: entry.account, amountCents: entry.amountCents, memo: entry.memo }));
}

describe("paid ride flow", () => {
  it("seeds an open Port Louis to Ébène trip on the next Mauritius day", async () => {
    const { state } = await demo();
    const found = searchRides(state, {
      originPlaceId: "port-louis",
      destinationPlaceId: "ebene",
      day: "2026-11-21",
      seats: 1,
    });
    expect(found.rides).toHaveLength(1);
    expect(found.rides[0]?.pricePerSeatCents).toBe(12_000);
  });

  it("books, captures a test card, and keeps the ledger balanced", async () => {
    const { state, passwordHash } = await demo();
    const signed = login(state, "passenger@bojosolutions.example", passwordHash);
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    const ride = state.rides.find((item) => item.id === "ride-pl-ebene");
    expect(ride).toBeTruthy();
    const booked = bookRide(signed.state, "user-passenger", "ride-pl-ebene", 1, now);
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;
    const before = booked.state.rides.find((item) => item.id === "ride-pl-ebene")?.seatsLeft;
    const paid = payBooking(
      booked.state,
      { passengerId: "user-passenger", bookingId: booked.data.bookingId, pan: "4242 4242 4242 4242", expiry: "12/34", cvc: "123" },
      now,
      adapters.payment,
      adapters.email,
    );
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.data.status).toBe("captured");
    expect(paid.state.rides.find((item) => item.id === "ride-pl-ebene")?.seatsLeft).toBe((before ?? 0) - 1);
    expect(ledgerBalanced(lines(paid.state))).toBe(true);
    expect(sumAccount(lines(paid.state), "platform_cash")).toBe(12_000);
    expect(JSON.stringify(paid.state)).not.toContain("4242424242424242");
    const again = payBooking(
      paid.state,
      { passengerId: "user-passenger", bookingId: booked.data.bookingId, pan: "4242424242424242", expiry: "12/34", cvc: "123" },
      now,
      adapters.payment,
      adapters.email,
    );
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.code).toBe("ALREADY_PAID");
    expect(again.state.rides.find((item) => item.id === "ride-pl-ebene")?.seatsLeft).toBe((before ?? 0) - 1);
  });

  it("declines the test failure card without taking a seat or storing the number", async () => {
    const { state } = await demo();
    const booked = bookRide(state, "user-passenger", "ride-pl-ebene", 2, now);
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;
    const declined = payBooking(
      booked.state,
      { passengerId: "user-passenger", bookingId: booked.data.bookingId, pan: "4000000000000002", expiry: "12/34", cvc: "123" },
      now,
      adapters.payment,
      adapters.email,
    );
    expect(declined.ok).toBe(true);
    if (!declined.ok) return;
    expect(declined.data.status).toBe("declined");
    expect(declined.state.rides.find((item) => item.id === "ride-pl-ebene")?.seatsLeft).toBe(3);
    const rejected = payBooking(
      declined.state,
      { passengerId: "user-passenger", bookingId: booked.data.bookingId, pan: "4111111111111111", expiry: "12/34", cvc: "123" },
      now,
      adapters.payment,
      adapters.email,
    );
    expect(rejected.ok).toBe(false);
    expect(JSON.stringify(rejected.state)).not.toContain("4111111111111111");
  });

  it("refunds a passenger cancel in full and refuses a late cancel", async () => {
    const { state } = await demo();
    const departure = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
    const posted = postRide(
      state,
      "user-driver",
      { originPlaceId: "moka", destinationPlaceId: "flic-en-flac", departureAt: departure, seatsTotal: 2, pricePerSeatCents: 15_000, notes: "" },
      now,
    );
    expect(posted.ok).toBe(true);
    if (!posted.ok) return;
    const booked = bookRide(posted.state, "user-passenger", posted.data.rideId, 1, now);
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;
    const paid = payBooking(
      booked.state,
      { passengerId: "user-passenger", bookingId: booked.data.bookingId, pan: "4242424242424242", expiry: "12/34", cvc: "123" },
      now,
      adapters.payment,
      adapters.email,
    );
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    const late = cancelBookingByPassenger(paid.state, "user-passenger", booked.data.bookingId, new Date(new Date(departure).getTime() - 30 * 60 * 1000), adapters.email);
    expect(late.ok).toBe(false);
    if (late.ok) return;
    expect(late.code).toBe("TOO_LATE");
    const cancelled = cancelBookingByPassenger(paid.state, "user-passenger", booked.data.bookingId, now, adapters.email);
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;
    expect(sumAccount(lines(cancelled.state), "platform_cash")).toBe(0);
    expect(ledgerBalanced(lines(cancelled.state))).toBe(true);
    expect(cancelled.state.rides.find((item) => item.id === posted.data.rideId)?.seatsLeft).toBe(2);
  });

  it("stops a driver booking their own ride and an unapproved driver posting", async () => {
    const { state } = await demo();
    const own = bookRide(state, "user-driver", "ride-pl-ebene", 1, now);
    expect(own.ok).toBe(false);
    if (own.ok) return;
    expect(own.code).toBe("OWN_RIDE");
    const blocked = postRide(
      state,
      "user-pending",
      {
        originPlaceId: "souillac",
        destinationPlaceId: "port-louis",
        departureAt: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        seatsTotal: 1,
        pricePerSeatCents: 18_000,
        notes: "",
      },
      now,
    );
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.code).toBe("NOT_APPROVED");
  });

  it("lets an admin approve a driver, then the driver can post", async () => {
    const { state } = await demo();
    const reviewed = reviewDriver(state, "user-admin", "profile-pending", "approved", "Demo approval", now, adapters.email);
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    const posted = postRide(
      reviewed.state,
      "user-pending",
      {
        originPlaceId: "souillac",
        destinationPlaceId: "port-louis",
        departureAt: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
        seatsTotal: 2,
        pricePerSeatCents: 22_000,
        notes: "Coast road",
      },
      now,
    );
    expect(posted.ok).toBe(true);
  });

  it("refunds every confirmed seat when the driver cancels", async () => {
    const { state } = await demo();
    const booked = bookRide(state, "user-passenger", "ride-curepipe-gb", 1, now);
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;
    const paid = payBooking(
      booked.state,
      { passengerId: "user-passenger", bookingId: booked.data.bookingId, pan: "4242424242424242", expiry: "12/34", cvc: "123" },
      now,
      adapters.payment,
      adapters.email,
    );
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    const cancelled = cancelRideByDriver(paid.state, "user-driver", "ride-curepipe-gb", now, adapters.email);
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;
    expect(cancelled.state.rides.find((item) => item.id === "ride-curepipe-gb")?.status).toBe("cancelled");
    expect(sumAccount(lines(cancelled.state), "driver_payable")).toBe(0);
    expect(ledgerBalanced(lines(cancelled.state))).toBe(true);
  });

  it("verifies a new account through the mock email and SMS codes", async () => {
    const { state } = await demo();
    const passwordHash = await hashPassword("new-pass-1");
    const created = register(
      state,
      { email: "new.rider@example.com", password: "new-pass-1", passwordHash, name: "Nadine Pierre", phone: "", confirmedAdult: true },
      now,
      adapters.email,
      () => 0,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const emailCode = created.state.messages.find((item) => item.userId === created.data.userId && item.code)?.code ?? "";
    const emailed = verifyEmail(created.state, created.data.userId, emailCode, now);
    expect(emailed.ok).toBe(true);
    if (!emailed.ok) return;
    const sms = requestPhoneCode(emailed.state, created.data.userId, "57110022", now, adapters.sms, () => 0.5);
    expect(sms.ok).toBe(true);
    if (!sms.ok) return;
    const phoneCode = sms.state.otps.find((item) => item.userId === created.data.userId && item.purpose === "phone")?.code ?? "";
    const phoned = verifyPhone(sms.state, created.data.userId, phoneCode, now);
    expect(phoned.ok).toBe(true);
    if (!phoned.ok) return;
    expect(phoned.state.users.find((user) => user.id === created.data.userId)?.phoneVerified).toBe(true);
    const applied = submitDriver(
      phoned.state,
      created.data.userId,
      {
        nicNumber: "C1234567890123",
        licenceNumber: "DL445566",
        licenceExpiry: "2028-01-01",
        vehicleMake: "Nissan",
        vehicleModel: "March",
        vehicleColour: "White",
        plate: "2201 AP 24",
        seatCount: 3,
        insuranceExpiry: "2027-08-01",
      },
      now,
    );
    expect(applied.ok).toBe(true);
  });

  it("completes a ride only inside the arrival window", async () => {
    const { state } = await demo();
    const booked = bookRide(state, "user-admin", "ride-pl-ebene", 1, now);
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;
    const paid = payBooking(
      booked.state,
      { passengerId: "user-admin", bookingId: booked.data.bookingId, pan: "4242424242424242", expiry: "12/34", cvc: "123" },
      now,
      adapters.payment,
      adapters.email,
    );
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    const early = completeRide(paid.state, "user-driver", "ride-pl-ebene", now);
    expect(early.ok).toBe(false);
    const departure = paid.state.rides.find((item) => item.id === "ride-pl-ebene")?.departureAt ?? now.toISOString();
    const done = completeRide(paid.state, "user-driver", "ride-pl-ebene", new Date(new Date(departure).getTime() + 60 * 1000));
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.state.bookings.find((item) => item.id === booked.data.bookingId)?.status).toBe("completed");
    expect(sumAccount(lines(done.state), "driver_payable")).toBeGreaterThan(0);
  });
});
