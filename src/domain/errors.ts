export type ErrorCode =
  | "INVALID_SEATS"
  | "INVALID_PRICE"
  | "INVALID_ROUTE"
  | "UNKNOWN_PLACE"
  | "TOO_SOON"
  | "NOT_APPROVED"
  | "DOCUMENTS_EXPIRED"
  | "OWN_RIDE"
  | "SEATS_GONE"
  | "RIDE_CLOSED"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "EMAIL_TAKEN"
  | "BAD_CREDENTIALS"
  | "WEAK_PASSWORD"
  | "INVALID_EMAIL"
  | "INVALID_NAME"
  | "INVALID_PHONE"
  | "INVALID_NIC"
  | "INVALID_PLATE"
  | "INVALID_DATE"
  | "ADULT_REQUIRED"
  | "NOT_A_TEST_CARD"
  | "DECLINED"
  | "BAD_EXPIRY"
  | "BAD_CVC"
  | "TOO_LATE"
  | "ALREADY_PAID"
  | "NOT_PAYABLE"
  | "RIDE_NOT_READY"
  | "ALREADY_FINISHED"
  | "ALREADY_BOOKED"
  | "EMAIL_UNVERIFIED"
  | "PHONE_UNVERIFIED"
  | "BAD_CODE"
  | "EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "NOTHING_TO_COMPLETE"
  | "INVALID_VEHICLE"
  | "NOTE_REQUIRED"
  | "ALREADY_VERIFIED"
  | "ALREADY_APPROVED";

export class DomainError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode) {
    super(code);
    this.code = code;
    this.name = "DomainError";
  }
}
