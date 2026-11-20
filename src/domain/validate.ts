import type { ErrorCode } from "./errors";
import { isIsoDay } from "./time";

export function validateEmail(email: string): ErrorCode | null {
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 120) return "INVALID_EMAIL";
  return null;
}

export function validateName(name: string): ErrorCode | null {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return "INVALID_NAME";
  return null;
}

export function validatePassword(password: string): ErrorCode | null {
  if (password.length < 8 || password.length > 72) return "WEAK_PASSWORD";
  return null;
}

export function validatePhone(phone: string): ErrorCode | null {
  if (!/^\d{8}$/.test(phone)) return "INVALID_PHONE";
  return null;
}

export function validateNic(nic: string): ErrorCode | null {
  if (!/^[A-Za-z0-9]{8,14}$/.test(nic.trim())) return "INVALID_NIC";
  return null;
}

export function validatePlate(plate: string): ErrorCode | null {
  const trimmed = plate.trim();
  if (!/^[A-Za-z0-9 ]{2,12}$/.test(trimmed) || !/\d/.test(trimmed)) return "INVALID_PLATE";
  return null;
}

export function validateText(value: string, max: number): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max;
}

export function validateExpiry(day: string, today: string): ErrorCode | null {
  if (!isIsoDay(day)) return "INVALID_DATE";
  if (day < today) return "DOCUMENTS_EXPIRED";
  return null;
}
