import { describe, expect, it } from "vitest";
import { haversineKm, rankMatches, rideMatches, type RideCandidate } from "./matching";
import { mauritiusDayBounds } from "./time";

const portLouis = { placeId: "port-louis", lat: -20.1609, lng: 57.5012 };
const ebene = { placeId: "ebene", lat: -20.244, lng: 57.49 };

function ride(overrides: Partial<RideCandidate> = {}): RideCandidate {
  return {
    id: "r",
    origin: portLouis,
    destination: ebene,
    departureAt: "2026-11-20T03:30:00.000Z",
    seatsLeft: 2,
    status: "open",
    pricePerSeatCents: 12_000,
    ...overrides,
  };
}

describe("matching", () => {
  const bounds = mauritiusDayBounds("2026-11-20");
  const query = {
    origin: portLouis,
    destination: ebene,
    dayStartMs: bounds.startMs,
    dayEndMs: bounds.endMs,
    seats: 1,
  };

  it("matches the same places on that Mauritius day", () => {
    expect(rideMatches(ride(), query)).toBe(true);
    expect(rideMatches(ride({ departureAt: "2026-11-20T21:00:00.000Z" }), query)).toBe(false);
    expect(rideMatches(ride({ seatsLeft: 0 }), { ...query, seats: 1 })).toBe(false);
    expect(rideMatches(ride({ status: "full" }), query)).toBe(false);
  });

  it("matches a nearby point and rejects a far one", () => {
    const near = { placeId: "near", lat: portLouis.lat + 0.04, lng: portLouis.lng };
    const far = { placeId: "far", lat: portLouis.lat + 0.25, lng: portLouis.lng };
    expect(haversineKm(portLouis, near)).toBeLessThan(8);
    expect(haversineKm(portLouis, far)).toBeGreaterThan(8);
    expect(rideMatches(ride(), { ...query, origin: near })).toBe(true);
    expect(rideMatches(ride(), { ...query, origin: far })).toBe(false);
  });

  it("ranks earlier departures, then cheaper seats", () => {
    const ranked = rankMatches([
      ride({ id: "late", departureAt: "2026-11-20T05:00:00.000Z", pricePerSeatCents: 5_000 }),
      ride({ id: "early-dear", departureAt: "2026-11-20T02:00:00.000Z", pricePerSeatCents: 9_000 }),
      ride({ id: "early-cheap", departureAt: "2026-11-20T02:00:00.000Z", pricePerSeatCents: 6_000 }),
    ]);
    expect(ranked.map((item) => item.id)).toEqual(["early-cheap", "early-dear", "late"]);
  });
});
