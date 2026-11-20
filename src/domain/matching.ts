export const MATCH_RADIUS_KM = 8;

export type LatLng = { lat: number; lng: number };

export type Endpoint = LatLng & { placeId: string };

export type RideCandidate = {
  id: string;
  origin: Endpoint;
  destination: Endpoint;
  departureAt: string;
  seatsLeft: number;
  status: string;
  pricePerSeatCents: number;
};

export type SearchQuery = {
  origin: Endpoint;
  destination: Endpoint;
  dayStartMs: number;
  dayEndMs: number;
  seats: number;
  radiusKm?: number;
};

export function haversineKm(a: LatLng, b: LatLng): number {
  const radius = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function endpointsMatch(rideEnd: Endpoint, queryEnd: Endpoint, radiusKm: number): boolean {
  if (rideEnd.placeId === queryEnd.placeId) return true;
  return haversineKm(rideEnd, queryEnd) <= radiusKm;
}

export function rideMatches(ride: RideCandidate, query: SearchQuery): boolean {
  if (ride.status !== "open") return false;
  if (ride.seatsLeft < query.seats) return false;
  const when = new Date(ride.departureAt).getTime();
  if (when < query.dayStartMs || when >= query.dayEndMs) return false;
  const radius = query.radiusKm ?? MATCH_RADIUS_KM;
  return endpointsMatch(ride.origin, query.origin, radius) && endpointsMatch(ride.destination, query.destination, radius);
}

export function rankMatches(rides: RideCandidate[]): RideCandidate[] {
  return [...rides].sort((a, b) => {
    const time = a.departureAt.localeCompare(b.departureAt);
    if (time !== 0) return time;
    return a.pricePerSeatCents - b.pricePerSeatCents;
  });
}

export function formatKm(km: number, locale: "en" | "fr"): string {
  const digits = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  const shown = locale === "fr" ? digits.replace(".", ",") : digits;
  return `${shown} km`;
}
