import { placeById } from "@/domain/places";
import { addMauritiusDays, atMauritius, mauritiusClock, mauritiusTodayISO } from "@/domain/time";
import { hashPassword } from "@/services/hash";
import type { AppState, Booking, Ride } from "./types";
import { STATE_VERSION } from "./types";

export const DEMO_PASSWORD = "demo-pass";

export const DEMO_ACCOUNTS = [
  { email: "passenger@bojosolutions.example", name: "Asha Ramgoolam", label: "passenger" },
  { email: "driver@bojosolutions.example", name: "Jean-Luc Baptiste", label: "driver" },
  { email: "pending@bojosolutions.example", name: "Meera Seewoosurrun", label: "pending" },
  { email: "admin@bojosolutions.example", name: "Kevin Admin", label: "admin" },
] as const;

function rideBetween(
  id: string,
  driverUserId: string,
  originId: string,
  destinationId: string,
  day: string,
  time: string,
  seats: number,
  pricePerSeatCents: number,
  notes: string,
  nowIso: string,
): Ride {
  const origin = placeById(originId);
  const destination = placeById(destinationId);
  if (!origin || !destination) throw new Error("seed place missing");
  return {
    id,
    driverUserId,
    originPlaceId: origin.id,
    destinationPlaceId: destination.id,
    originLat: origin.lat,
    originLng: origin.lng,
    destinationLat: destination.lat,
    destinationLng: destination.lng,
    departureAt: atMauritius(day, time).toISOString(),
    seatsTotal: seats,
    seatsLeft: seats,
    pricePerSeatCents,
    notes,
    status: "open",
    seeded: true,
    createdAt: nowIso,
  };
}

export async function createSeedState(now: Date, locale: AppState["locale"] = "en"): Promise<AppState> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const createdAt = now.toISOString();
  const today = mauritiusTodayISO(now);
  const tomorrow = addMauritiusDays(today, 1);
  const dayAfter = addMauritiusDays(today, 2);
  const users = [
    user("user-passenger", "passenger@bojosolutions.example", "Asha Ramgoolam", "57123456", false, passwordHash, createdAt),
    user("user-driver", "driver@bojosolutions.example", "Jean-Luc Baptiste", "59111222", false, passwordHash, createdAt),
    user("user-pending", "pending@bojosolutions.example", "Meera Seewoosurrun", "54222333", false, passwordHash, createdAt),
    user("user-admin", "admin@bojosolutions.example", "Kevin Admin", "52555666", true, passwordHash, createdAt),
  ];
  return {
    version: STATE_VERSION,
    locale,
    users,
    profiles: [
      {
        id: "profile-driver",
        userId: "user-driver",
        nicNumber: "B1234567890123",
        licenceNumber: "DL998877",
        licenceExpiry: "2028-06-30",
        vehicleMake: "Toyota",
        vehicleModel: "Vitz",
        vehicleColour: "Silver",
        plate: "4823 JN 26",
        seatCount: 3,
        insuranceExpiry: "2027-04-01",
        status: "approved",
        reviewNote: "Seeded demo approval. Not a check against NLTA.",
        reviewedAt: createdAt,
        reviewedBy: "user-admin",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "profile-pending",
        userId: "user-pending",
        nicNumber: "S2345678901234",
        licenceNumber: "DL112233",
        licenceExpiry: "2027-12-31",
        vehicleMake: "Suzuki",
        vehicleModel: "Swift",
        vehicleColour: "Blue",
        plate: "1904 MY 25",
        seatCount: 3,
        insuranceExpiry: "2027-01-15",
        status: "pending",
        reviewNote: "",
        reviewedAt: null,
        reviewedBy: null,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    rides: [
      rideBetween(
        "ride-pl-ebene",
        "user-driver",
        "port-louis",
        "ebene",
        tomorrow,
        "07:30",
        3,
        12_000,
        "Office run. Pickup at the Victoria bus station side.",
        createdAt,
      ),
      rideBetween(
        "ride-curepipe-gb",
        "user-driver",
        "curepipe",
        "grand-baie",
        tomorrow,
        "16:45",
        2,
        25_000,
        "North coast in the afternoon. One bag each.",
        createdAt,
      ),
      rideBetween(
        "ride-gb-pl",
        "user-driver",
        "grand-baie",
        "port-louis",
        dayAfter,
        "08:00",
        3,
        20_000,
        "Back to town the next morning.",
        createdAt,
      ),
    ],
    bookings: [],
    payments: [],
    ledger: [],
    messages: [
      {
        id: "msg-welcome",
        userId: "user-passenger",
        channel: "email",
        adapter: "mock",
        title: "Welcome to the Carpool Mauritius demo",
        body: "This inbox is inside the app. No email server was contacted. TEST MODE is on for every payment.",
        code: null,
        createdAt,
        read: false,
      },
    ],
    otps: [],
    sessionUserId: null,
  };
}

function user(
  id: string,
  email: string,
  name: string,
  phone: string,
  isAdmin: boolean,
  passwordHash: string,
  createdAt: string,
) {
  return {
    id,
    email,
    passwordHash,
    name,
    phone,
    isAdmin,
    confirmedAdult: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt,
  };
}

export function rollSeedRides(state: AppState, now: Date): AppState {
  const today = mauritiusTodayISO(now);
  let changed = false;
  const rides = state.rides.map((ride) => {
    if (!ride.seeded) return ride;
    if (new Date(ride.departureAt).getTime() > now.getTime()) return ride;
    const blocked = state.bookings.some(
      (booking) =>
        booking.rideId === ride.id &&
        (booking.status === "confirmed" || booking.status === "completed" || booking.status === "pending_payment"),
    );
    if (blocked) return ride;
    changed = true;
    const tomorrow = addMauritiusDays(today, 1);
    return {
      ...ride,
      departureAt: atMauritius(tomorrow, mauritiusClock(new Date(ride.departureAt))).toISOString(),
      status: "open" as const,
      seatsLeft: ride.seatsTotal,
    };
  });
  return changed ? { ...state, rides } : state;
}

export function activeBookings(bookings: Booking[], rideId: string): Booking[] {
  return bookings.filter((booking) => booking.rideId === rideId && booking.status !== "cancelled");
}
