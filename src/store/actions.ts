import type { ErrorCode } from "@/domain/errors";
import {
  captureLines,
  driverMayComplete,
  ledgerBalanced,
  MAX_SEATS_PER_BOOKING,
  MIN_LEAD_MS,
  passengerMayCancel,
  quoteFare,
  refundLines,
  type Quote,
} from "@/domain/money";
import { rideMatches, rankMatches, type RideCandidate } from "@/domain/matching";
import { placeById } from "@/domain/places";
import { mauritiusDayBounds, mauritiusTodayISO } from "@/domain/time";
import {
  validateEmail,
  validateExpiry,
  validateName,
  validateNic,
  validatePassword,
  validatePhone,
  validatePlate,
  validateText,
} from "@/domain/validate";
import type { Notifier, PaymentProvider } from "@/services/adapters";
import { formatMur } from "@/domain/money";
import type { AppState, Booking, InboxMessage, LedgerEntry, Payment, Ride, User } from "./types";

export type ActionResult<T = undefined> =
  | { ok: true; state: AppState; data: T }
  | { ok: false; state: AppState; code: ErrorCode };

function ok<T>(state: AppState, data: T): ActionResult<T> {
  return { ok: true, state, data };
}

function fail(state: AppState, code: ErrorCode): ActionResult<never> {
  return { ok: false, state, code };
}

function uid(): string {
  return crypto.randomUUID();
}

function makeCode(random: () => number): string {
  return String(Math.floor(random() * 900000) + 100000);
}

function quoteOf(booking: Booking): Quote {
  return {
    seats: booking.seats,
    pricePerSeatCents: Math.round(booking.fareCents / booking.seats),
    fareCents: booking.fareCents,
    commissionCents: booking.commissionCents,
    driverNetCents: booking.driverNetCents,
    currency: "MUR",
  };
}

function addLedger(state: AppState, bookingId: string, paymentId: string | null, lines: ReturnType<typeof captureLines>, now: Date): LedgerEntry[] {
  return [
    ...state.ledger,
    ...lines.map((line) => ({
      id: uid(),
      bookingId,
      paymentId,
      account: line.account,
      amountCents: line.amountCents,
      memo: line.memo,
      createdAt: now.toISOString(),
    })),
  ];
}

function assertBooks(ledger: LedgerEntry[]) {
  const lines = ledger.map((entry) => ({ account: entry.account, amountCents: entry.amountCents, memo: entry.memo }));
  if (!ledgerBalanced(lines)) throw new Error("ledger imbalance");
}

function message(
  state: AppState,
  input: Omit<InboxMessage, "id" | "read">,
): AppState {
  return {
    ...state,
    messages: [{ ...input, id: uid(), read: false }, ...state.messages],
  };
}

function bilingual(en: string, fr: string): string {
  return `${en}\n\n${fr}\n\nThis stayed in the app. Nothing was sent to a phone network or an email server. / Ceci reste dans l'application. Rien n'a été envoyé.`;
}

export function login(state: AppState, email: string, passwordHash: string): ActionResult<{ userId: string }> {
  const user = state.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.passwordHash !== passwordHash) return fail(state, "BAD_CREDENTIALS");
  return ok({ ...state, sessionUserId: user.id }, { userId: user.id });
}

export function logout(state: AppState): AppState {
  return { ...state, sessionUserId: null };
}

export function setLocale(state: AppState, locale: AppState["locale"]): AppState {
  return { ...state, locale };
}

export function register(
  state: AppState,
  input: { email: string; password: string; passwordHash: string; name: string; phone: string; confirmedAdult: boolean },
  now: Date,
  emailNotifier: Notifier,
  random: () => number = Math.random,
): ActionResult<{ userId: string }> {
  const emailError = validateEmail(input.email);
  if (emailError) return fail(state, emailError);
  const nameError = validateName(input.name);
  if (nameError) return fail(state, nameError);
  const passwordError = validatePassword(input.password);
  if (passwordError) return fail(state, passwordError);
  if (input.phone && validatePhone(input.phone)) return fail(state, "INVALID_PHONE");
  if (!input.confirmedAdult) return fail(state, "ADULT_REQUIRED");
  if (state.users.some((user) => user.email.toLowerCase() === input.email.trim().toLowerCase())) {
    return fail(state, "EMAIL_TAKEN");
  }
  const user: User = {
    id: uid(),
    email: input.email.trim().toLowerCase(),
    passwordHash: input.passwordHash,
    name: input.name.trim(),
    phone: input.phone,
    isAdmin: false,
    confirmedAdult: true,
    emailVerified: false,
    phoneVerified: false,
    createdAt: now.toISOString(),
  };
  let next: AppState = { ...state, users: [...state.users, user], sessionUserId: user.id };
  next = issueCode(next, user.id, "email", emailNotifier, now, random, user.email);
  return ok(next, { userId: user.id });
}

function issueCode(
  state: AppState,
  userId: string,
  purpose: "email" | "phone",
  notifier: Notifier,
  now: Date,
  random: () => number,
  to: string,
): AppState {
  const code = makeCode(random);
  const minutes = purpose === "email" ? 30 : 10;
  const expiresAt = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
  const otps = state.otps.filter((otp) => !(otp.userId === userId && otp.purpose === purpose));
  const titled = purpose === "email" ? "Email confirmation code" : "Phone confirmation code";
  const titledFr = purpose === "email" ? "Code de confirmation e-mail" : "Code de confirmation téléphone";
  const withOtp: AppState = {
    ...state,
    otps: [...otps, { id: uid(), userId, purpose, code, expiresAt, attempts: 0 }],
  };
  return message(withOtp, {
    userId,
    channel: notifier.channel,
    adapter: notifier.mode,
    title: `${titled} / ${titledFr}`,
    body: bilingual(
      `TEST inbox for ${to}. Your code is ${code}. It expires in ${minutes} minutes.`,
      `Boîte TEST pour ${to}. Votre code est ${code}. Il expire dans ${minutes} minutes.`,
    ),
    code,
    createdAt: now.toISOString(),
  });
}

export function requestEmailCode(
  state: AppState,
  userId: string,
  now: Date,
  emailNotifier: Notifier,
  random: () => number = Math.random,
): ActionResult {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return fail(state, "NOT_FOUND");
  if (user.emailVerified) return fail(state, "ALREADY_VERIFIED");
  return ok(issueCode(state, userId, "email", emailNotifier, now, random, user.email), undefined);
}

export function requestPhoneCode(
  state: AppState,
  userId: string,
  phone: string,
  now: Date,
  smsNotifier: Notifier,
  random: () => number = Math.random,
): ActionResult {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return fail(state, "NOT_FOUND");
  if (validatePhone(phone)) return fail(state, "INVALID_PHONE");
  if (user.phoneVerified && user.phone === phone) return fail(state, "ALREADY_VERIFIED");
  const users = state.users.map((item) => (item.id === userId ? { ...item, phone, phoneVerified: false } : item));
  return ok(issueCode({ ...state, users }, userId, "phone", smsNotifier, now, random, `+230 ${phone}`), undefined);
}

function verify(
  state: AppState,
  userId: string,
  purpose: "email" | "phone",
  code: string,
  now: Date,
): ActionResult {
  const otp = state.otps.find((item) => item.userId === userId && item.purpose === purpose);
  if (!otp) return fail(state, "BAD_CODE");
  if (new Date(otp.expiresAt).getTime() < now.getTime()) return fail(state, "EXPIRED");
  if (otp.attempts >= 5) return fail(state, "TOO_MANY_ATTEMPTS");
  if (otp.code !== code.trim()) {
    return fail(
      {
        ...state,
        otps: state.otps.map((item) => (item.id === otp.id ? { ...item, attempts: item.attempts + 1 } : item)),
      },
      "BAD_CODE",
    );
  }
  const users = state.users.map((user) =>
    user.id === userId
      ? { ...user, emailVerified: purpose === "email" ? true : user.emailVerified, phoneVerified: purpose === "phone" ? true : user.phoneVerified }
      : user,
  );
  return ok({ ...state, users, otps: state.otps.filter((item) => item.id !== otp.id) }, undefined);
}

export function verifyEmail(state: AppState, userId: string, code: string, now: Date): ActionResult {
  return verify(state, userId, "email", code, now);
}

export function verifyPhone(state: AppState, userId: string, code: string, now: Date): ActionResult {
  return verify(state, userId, "phone", code, now);
}

export type DriverInput = {
  nicNumber: string;
  licenceNumber: string;
  licenceExpiry: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColour: string;
  plate: string;
  seatCount: number;
  insuranceExpiry: string;
};

export function submitDriver(state: AppState, userId: string, input: DriverInput, now: Date): ActionResult {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return fail(state, "UNAUTHORIZED");
  if (!user.emailVerified) return fail(state, "EMAIL_UNVERIFIED");
  if (!user.phoneVerified) return fail(state, "PHONE_UNVERIFIED");
  const today = mauritiusTodayISO(now);
  const nic = validateNic(input.nicNumber);
  if (nic) return fail(state, nic);
  if (!validateText(input.licenceNumber, 20)) return fail(state, "INVALID_VEHICLE");
  const licence = validateExpiry(input.licenceExpiry, today);
  if (licence) return fail(state, licence);
  const insurance = validateExpiry(input.insuranceExpiry, today);
  if (insurance) return fail(state, insurance);
  if (!validateText(input.vehicleMake, 40) || !validateText(input.vehicleModel, 40) || !validateText(input.vehicleColour, 40)) {
    return fail(state, "INVALID_VEHICLE");
  }
  const plate = validatePlate(input.plate);
  if (plate) return fail(state, plate);
  if (!Number.isInteger(input.seatCount) || input.seatCount < 1 || input.seatCount > 6) return fail(state, "INVALID_SEATS");
  const existing = state.profiles.find((profile) => profile.userId === userId);
  if (existing?.status === "approved") return fail(state, "ALREADY_APPROVED");
  const profile = {
    id: existing?.id ?? uid(),
    userId,
    nicNumber: input.nicNumber.trim(),
    licenceNumber: input.licenceNumber.trim(),
    licenceExpiry: input.licenceExpiry,
    vehicleMake: input.vehicleMake.trim(),
    vehicleModel: input.vehicleModel.trim(),
    vehicleColour: input.vehicleColour.trim(),
    plate: input.plate.trim(),
    seatCount: input.seatCount,
    insuranceExpiry: input.insuranceExpiry,
    status: "pending" as const,
    reviewNote: "",
    reviewedAt: null,
    reviewedBy: null,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const profiles = existing ? state.profiles.map((item) => (item.id === existing.id ? profile : item)) : [...state.profiles, profile];
  return ok({ ...state, profiles }, undefined);
}

export function reviewDriver(
  state: AppState,
  adminId: string,
  profileId: string,
  decision: "approved" | "rejected",
  note: string,
  now: Date,
  emailNotifier: Notifier,
): ActionResult {
  const admin = state.users.find((user) => user.id === adminId);
  if (!admin?.isAdmin) return fail(state, "FORBIDDEN");
  const profile = state.profiles.find((item) => item.id === profileId);
  if (!profile) return fail(state, "NOT_FOUND");
  if (decision === "rejected" && note.trim().length < 3) return fail(state, "NOTE_REQUIRED");
  if (decision === "approved") {
    const today = mauritiusTodayISO(now);
    if (validateExpiry(profile.licenceExpiry, today) || validateExpiry(profile.insuranceExpiry, today)) {
      return fail(state, "DOCUMENTS_EXPIRED");
    }
  }
  const updated = {
    ...profile,
    status: decision,
    reviewNote: note.trim(),
    reviewedAt: now.toISOString(),
    reviewedBy: adminId,
    updatedAt: now.toISOString(),
  };
  let next: AppState = { ...state, profiles: state.profiles.map((item) => (item.id === profileId ? updated : item)) };
  const en = decision === "approved" ? "Your driver profile is approved in this demo. You can post a ride." : `Your driver profile was not approved. ${note.trim()}`;
  const fr = decision === "approved" ? "Votre profil conducteur est approuvé dans cette démo. Vous pouvez publier un trajet." : `Votre profil conducteur n'est pas approuvé. ${note.trim()}`;
  next = message(next, {
    userId: profile.userId,
    channel: emailNotifier.channel,
    adapter: emailNotifier.mode,
    title: "Driver review / Vérification conducteur",
    body: bilingual(en, fr),
    code: null,
    createdAt: now.toISOString(),
  });
  return ok(next, undefined);
}

export type RideInput = {
  originPlaceId: string;
  destinationPlaceId: string;
  departureAt: string;
  seatsTotal: number;
  pricePerSeatCents: number;
  notes: string;
};

export function postRide(state: AppState, driverUserId: string, input: RideInput, now: Date): ActionResult<{ rideId: string }> {
  const user = state.users.find((item) => item.id === driverUserId);
  if (!user) return fail(state, "UNAUTHORIZED");
  if (!user.emailVerified) return fail(state, "EMAIL_UNVERIFIED");
  if (!user.phoneVerified) return fail(state, "PHONE_UNVERIFIED");
  const profile = state.profiles.find((item) => item.userId === driverUserId);
  if (!profile || profile.status !== "approved") return fail(state, "NOT_APPROVED");
  const today = mauritiusTodayISO(now);
  if (validateExpiry(profile.licenceExpiry, today) || validateExpiry(profile.insuranceExpiry, today)) {
    return fail(state, "DOCUMENTS_EXPIRED");
  }
  const origin = placeById(input.originPlaceId);
  const destination = placeById(input.destinationPlaceId);
  if (!origin || !destination) return fail(state, "UNKNOWN_PLACE");
  if (origin.id === destination.id) return fail(state, "INVALID_ROUTE");
  const departure = new Date(input.departureAt);
  if (Number.isNaN(departure.getTime()) || departure.getTime() < now.getTime() + MIN_LEAD_MS) return fail(state, "TOO_SOON");
  if (!Number.isInteger(input.seatsTotal) || input.seatsTotal < 1 || input.seatsTotal > profile.seatCount) {
    return fail(state, "INVALID_SEATS");
  }
  try {
    quoteFare(1, input.pricePerSeatCents);
  } catch (error) {
    return fail(state, error instanceof Error && "code" in error ? (error.code as ErrorCode) : "INVALID_PRICE");
  }
  if (input.notes.trim().length > 280) return fail(state, "INVALID_VEHICLE");
  const ride: Ride = {
    id: uid(),
    driverUserId,
    originPlaceId: origin.id,
    destinationPlaceId: destination.id,
    originLat: origin.lat,
    originLng: origin.lng,
    destinationLat: destination.lat,
    destinationLng: destination.lng,
    departureAt: departure.toISOString(),
    seatsTotal: input.seatsTotal,
    seatsLeft: input.seatsTotal,
    pricePerSeatCents: input.pricePerSeatCents,
    notes: input.notes.trim(),
    status: "open",
    seeded: false,
    createdAt: now.toISOString(),
  };
  return ok({ ...state, rides: [...state.rides, ride] }, { rideId: ride.id });
}

export function searchRides(
  state: AppState,
  query: { originPlaceId: string; destinationPlaceId: string; day: string; seats: number },
): { rides: Ride[]; code?: ErrorCode } {
  const origin = placeById(query.originPlaceId);
  const destination = placeById(query.destinationPlaceId);
  if (!origin || !destination) return { rides: [], code: "UNKNOWN_PLACE" };
  if (origin.id === destination.id) return { rides: [], code: "INVALID_ROUTE" };
  if (!Number.isInteger(query.seats) || query.seats < 1 || query.seats > MAX_SEATS_PER_BOOKING) {
    return { rides: [], code: "INVALID_SEATS" };
  }
  let bounds: { startMs: number; endMs: number };
  try {
    bounds = mauritiusDayBounds(query.day);
  } catch {
    return { rides: [], code: "INVALID_DATE" };
  }
  const candidates: RideCandidate[] = state.rides.map((ride) => ({
    id: ride.id,
    origin: { placeId: ride.originPlaceId, lat: ride.originLat, lng: ride.originLng },
    destination: { placeId: ride.destinationPlaceId, lat: ride.destinationLat, lng: ride.destinationLng },
    departureAt: ride.departureAt,
    seatsLeft: ride.seatsLeft,
    status: ride.status,
    pricePerSeatCents: ride.pricePerSeatCents,
  }));
  const ids = new Set(
    rankMatches(
      candidates.filter((ride) =>
        rideMatches(ride, {
          origin: { placeId: origin.id, lat: origin.lat, lng: origin.lng },
          destination: { placeId: destination.id, lat: destination.lat, lng: destination.lng },
          dayStartMs: bounds.startMs,
          dayEndMs: bounds.endMs,
          seats: query.seats,
        }),
      ),
    ).map((ride) => ride.id),
  );
  const rides = state.rides.filter((ride) => ids.has(ride.id));
  rides.sort((a, b) => a.departureAt.localeCompare(b.departureAt) || a.pricePerSeatCents - b.pricePerSeatCents);
  return { rides };
}

export function bookRide(state: AppState, passengerId: string, rideId: string, seats: number, now: Date): ActionResult<{ bookingId: string }> {
  const passenger = state.users.find((user) => user.id === passengerId);
  if (!passenger) return fail(state, "UNAUTHORIZED");
  if (!passenger.emailVerified) return fail(state, "EMAIL_UNVERIFIED");
  if (!passenger.phoneVerified) return fail(state, "PHONE_UNVERIFIED");
  const ride = state.rides.find((item) => item.id === rideId);
  if (!ride) return fail(state, "NOT_FOUND");
  if (ride.driverUserId === passengerId) return fail(state, "OWN_RIDE");
  if (ride.status !== "open") return fail(state, "RIDE_CLOSED");
  if (state.bookings.some((booking) => booking.rideId === rideId && booking.passengerId === passengerId && (booking.status === "pending_payment" || booking.status === "confirmed"))) {
    return fail(state, "ALREADY_BOOKED");
  }
  let quote: Quote;
  try {
    quote = quoteFare(seats, ride.pricePerSeatCents);
  } catch (error) {
    return fail(state, error instanceof Error && "code" in error ? (error.code as ErrorCode) : "INVALID_SEATS");
  }
  if (seats > ride.seatsLeft) return fail(state, "SEATS_GONE");
  const booking: Booking = {
    id: uid(),
    rideId,
    passengerId,
    seats,
    fareCents: quote.fareCents,
    commissionCents: quote.commissionCents,
    driverNetCents: quote.driverNetCents,
    status: "pending_payment",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const payment: Payment = {
    id: uid(),
    bookingId: booking.id,
    provider: "demo",
    providerRef: `pending_${booking.id}`,
    amountCents: quote.fareCents,
    status: "requires_payment",
    last4: null,
    testMode: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  return ok({ ...state, bookings: [...state.bookings, booking], payments: [...state.payments, payment] }, { bookingId: booking.id });
}

export function payBooking(
  state: AppState,
  input: { passengerId: string; bookingId: string; pan: string; expiry: string; cvc: string },
  now: Date,
  provider: PaymentProvider,
  emailNotifier: Notifier,
): ActionResult<{ status: "captured" | "declined" }> {
  const booking = state.bookings.find((item) => item.id === input.bookingId);
  if (!booking || booking.passengerId !== input.passengerId) return fail(state, "NOT_FOUND");
  if (booking.status === "confirmed" || booking.status === "completed") return fail(state, "ALREADY_PAID");
  if (booking.status !== "pending_payment") return fail(state, "NOT_PAYABLE");
  const ride = state.rides.find((item) => item.id === booking.rideId);
  if (!ride || ride.status === "cancelled" || ride.status === "completed") return fail(state, "RIDE_CLOSED");
  const payment = state.payments.find((item) => item.bookingId === booking.id && item.status !== "refunded");
  if (!payment) return fail(state, "NOT_PAYABLE");
  if (payment.status === "captured") return fail(state, "ALREADY_PAID");
  const charge = provider.charge({ pan: input.pan, expiry: input.expiry, cvc: input.cvc, amountCents: booking.fareCents });
  if (!charge.ok) return fail(state, charge.code);
  if (charge.status === "declined") {
    const payments = state.payments.map((item) =>
      item.id === payment.id
        ? { ...item, status: "declined" as const, last4: charge.last4, provider: provider.id, providerRef: `${provider.id}_${payment.id}`, updatedAt: now.toISOString() }
        : item,
    );
    return ok({ ...state, payments }, { status: "declined" });
  }
  if (ride.seatsLeft < booking.seats || ride.status !== "open") return fail(state, "SEATS_GONE");
  const seatsLeft = ride.seatsLeft - booking.seats;
  const rides = state.rides.map((item) =>
    item.id === ride.id ? { ...item, seatsLeft, status: seatsLeft === 0 ? ("full" as const) : item.status } : item,
  );
  const bookings = state.bookings.map((item) =>
    item.id === booking.id ? { ...item, status: "confirmed" as const, updatedAt: now.toISOString() } : item,
  );
  const payments = state.payments.map((item) =>
    item.id === payment.id
      ? {
          ...item,
          status: "captured" as const,
          last4: charge.last4,
          provider: provider.id,
          providerRef: `${provider.id}_${payment.id}`,
          updatedAt: now.toISOString(),
        }
      : item,
  );
  const ledger = addLedger(state, booking.id, payment.id, captureLines(quoteOf(booking)), now);
  assertBooks(ledger);
  let next: AppState = { ...state, rides, bookings, payments, ledger };
  next = message(next, {
    userId: booking.passengerId,
    channel: emailNotifier.channel,
    adapter: emailNotifier.mode,
    title: "TEST MODE receipt / Reçu MODE TEST",
    body: bilingual(
      `TEST MODE receipt. You paid ${formatMur(booking.fareCents, "en")} for ${booking.seats} seat(s). Platform fee ${formatMur(booking.commissionCents, "en")}. Recorded as payable to the driver: ${formatMur(booking.driverNetCents, "en")}. No bank captured this.`,
      `Reçu MODE TEST. Vous avez payé ${formatMur(booking.fareCents, "fr")} pour ${booking.seats} place(s). Frais de plateforme ${formatMur(booking.commissionCents, "fr")}. Payable au conducteur : ${formatMur(booking.driverNetCents, "fr")}. Aucune banque n'a encaissé.`,
    ),
    code: null,
    createdAt: now.toISOString(),
  });
  return ok(next, { status: "captured" });
}

function refundBooking(state: AppState, booking: Booking, now: Date, emailNotifier: Notifier): AppState {
  const payment = state.payments.find((item) => item.bookingId === booking.id && item.status === "captured");
  const ride = state.rides.find((item) => item.id === booking.rideId);
  let rides = state.rides;
  if (ride && (ride.status === "open" || ride.status === "full")) {
    const seatsLeft = Math.min(ride.seatsTotal, ride.seatsLeft + booking.seats);
    rides = state.rides.map((item) =>
      item.id === ride.id ? { ...item, seatsLeft, status: item.status === "full" ? "open" : item.status } : item,
    );
  }
  const bookings = state.bookings.map((item) =>
    item.id === booking.id ? { ...item, status: "refunded" as const, updatedAt: now.toISOString() } : item,
  );
  const payments = state.payments.map((item) =>
    item.id === payment?.id ? { ...item, status: "refunded" as const, updatedAt: now.toISOString() } : item,
  );
  const ledger = payment ? addLedger({ ...state, ledger: state.ledger }, booking.id, payment.id, refundLines(quoteOf(booking)), now) : state.ledger;
  assertBooks(ledger);
  let next: AppState = { ...state, rides, bookings, payments, ledger };
  next = message(next, {
    userId: booking.passengerId,
    channel: emailNotifier.channel,
    adapter: emailNotifier.mode,
    title: "TEST MODE refund / Remboursement MODE TEST",
    body: bilingual(
      `TEST MODE refund of ${formatMur(booking.fareCents, "en")}. The ledger was reversed. No bank transfer was made.`,
      `Remboursement MODE TEST de ${formatMur(booking.fareCents, "fr")}. Le registre a été inversé. Aucun virement bancaire.`,
    ),
    code: null,
    createdAt: now.toISOString(),
  });
  return next;
}

export function cancelBookingByPassenger(
  state: AppState,
  passengerId: string,
  bookingId: string,
  now: Date,
  emailNotifier: Notifier,
): ActionResult {
  const booking = state.bookings.find((item) => item.id === bookingId && item.passengerId === passengerId);
  if (!booking) return fail(state, "NOT_FOUND");
  const ride = state.rides.find((item) => item.id === booking.rideId);
  if (!ride) return fail(state, "NOT_FOUND");
  if (booking.status === "pending_payment") {
    const bookings = state.bookings.map((item) =>
      item.id === booking.id ? { ...item, status: "cancelled" as const, updatedAt: now.toISOString() } : item,
    );
    return ok({ ...state, bookings }, undefined);
  }
  if (booking.status !== "confirmed") return fail(state, "NOT_PAYABLE");
  if (ride.status === "cancelled" || ride.status === "completed") return fail(state, "RIDE_CLOSED");
  if (!passengerMayCancel(now, ride.departureAt)) return fail(state, "TOO_LATE");
  return ok(refundBooking(state, booking, now, emailNotifier), undefined);
}

export function cancelRideByDriver(state: AppState, driverUserId: string, rideId: string, now: Date, emailNotifier: Notifier): ActionResult {
  const ride = state.rides.find((item) => item.id === rideId && item.driverUserId === driverUserId);
  if (!ride) return fail(state, "NOT_FOUND");
  if (ride.status === "completed") return fail(state, "ALREADY_FINISHED");
  if (ride.status === "cancelled") return fail(state, "RIDE_CLOSED");
  let next: AppState = {
    ...state,
    rides: state.rides.map((item) => (item.id === ride.id ? { ...item, status: "cancelled" as const } : item)),
  };
  for (const booking of state.bookings.filter((item) => item.rideId === ride.id && item.status === "confirmed")) {
    next = refundBooking(next, booking, now, emailNotifier);
  }
  next = {
    ...next,
    bookings: next.bookings.map((item) =>
      item.rideId === ride.id && item.status === "pending_payment"
        ? { ...item, status: "cancelled" as const, updatedAt: now.toISOString() }
        : item,
    ),
  };
  return ok(next, undefined);
}

export function completeRide(state: AppState, driverUserId: string, rideId: string, now: Date): ActionResult {
  const ride = state.rides.find((item) => item.id === rideId && item.driverUserId === driverUserId);
  if (!ride) return fail(state, "NOT_FOUND");
  if (ride.status === "completed" || ride.status === "cancelled") return fail(state, "ALREADY_FINISHED");
  if (!driverMayComplete(now, ride.departureAt)) return fail(state, "RIDE_NOT_READY");
  const confirmed = state.bookings.some((booking) => booking.rideId === ride.id && booking.status === "confirmed");
  if (!confirmed) return fail(state, "NOTHING_TO_COMPLETE");
  return ok(
    {
      ...state,
      rides: state.rides.map((item) => (item.id === ride.id ? { ...item, status: "completed" as const } : item)),
      bookings: state.bookings.map((item) =>
        item.rideId === ride.id && item.status === "confirmed" ? { ...item, status: "completed" as const, updatedAt: now.toISOString() } : item,
      ),
    },
    undefined,
  );
}

export function markAllRead(state: AppState, userId: string): AppState {
  return {
    ...state,
    messages: state.messages.map((item) => (item.userId === userId ? { ...item, read: true } : item)),
  };
}
