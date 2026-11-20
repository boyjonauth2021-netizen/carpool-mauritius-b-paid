export const STATE_VERSION = 1 as const;

export type Locale = "en" | "fr";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  isAdmin: boolean;
  confirmedAdult: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
};

export type DriverProfile = {
  id: string;
  userId: string;
  nicNumber: string;
  licenceNumber: string;
  licenceExpiry: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColour: string;
  plate: string;
  seatCount: number;
  insuranceExpiry: string;
  status: "pending" | "approved" | "rejected";
  reviewNote: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Ride = {
  id: string;
  driverUserId: string;
  originPlaceId: string;
  destinationPlaceId: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  departureAt: string;
  seatsTotal: number;
  seatsLeft: number;
  pricePerSeatCents: number;
  notes: string;
  status: "open" | "full" | "cancelled" | "completed";
  seeded: boolean;
  createdAt: string;
};

export type Booking = {
  id: string;
  rideId: string;
  passengerId: string;
  seats: number;
  fareCents: number;
  commissionCents: number;
  driverNetCents: number;
  status: "pending_payment" | "confirmed" | "completed" | "cancelled" | "refunded";
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  bookingId: string;
  provider: "demo" | "sandbox";
  providerRef: string;
  amountCents: number;
  status: "requires_payment" | "captured" | "declined" | "refunded";
  last4: string | null;
  testMode: true;
  createdAt: string;
  updatedAt: string;
};

export type LedgerEntry = {
  id: string;
  bookingId: string;
  paymentId: string | null;
  account: "platform_cash" | "platform_commission" | "driver_payable";
  amountCents: number;
  memo: string;
  createdAt: string;
};

export type InboxMessage = {
  id: string;
  userId: string;
  channel: "email" | "sms";
  adapter: "mock" | "sandbox";
  title: string;
  body: string;
  code: string | null;
  createdAt: string;
  read: boolean;
};

export type OtpChallenge = {
  id: string;
  userId: string;
  purpose: "phone" | "email";
  code: string;
  expiresAt: string;
  attempts: number;
};

export type AppState = {
  version: typeof STATE_VERSION;
  locale: Locale;
  users: User[];
  profiles: DriverProfile[];
  rides: Ride[];
  bookings: Booking[];
  payments: Payment[];
  ledger: LedgerEntry[];
  messages: InboxMessage[];
  otps: OtpChallenge[];
  sessionUserId: string | null;
};
