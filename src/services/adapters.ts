import { judgeTestCard } from "@/domain/money";

export type CardInput = { pan: string; expiry: string; cvc: string; amountCents: number };

export type ChargeResult =
  | { ok: true; status: "captured" | "declined"; last4: string }
  | { ok: false; code: "NOT_A_TEST_CARD" | "BAD_EXPIRY" | "BAD_CVC" };

export type PaymentProvider = {
  readonly id: "demo" | "sandbox";
  readonly testMode: true;
  readonly label: "simulator" | "sandbox";
  charge(input: CardInput): ChargeResult;
};

export type Notifier = {
  channel: "email" | "sms";
  mode: "mock" | "sandbox";
};

export type AdapterEnv = {
  VITE_PAYMENTS_MODE?: string;
  VITE_PAYMENT_PROVIDER?: string;
  VITE_PAYMENT_SECRET_KEY?: string;
  VITE_PAYMENT_PUBLISHABLE_KEY?: string;
  VITE_GOOGLE_MAPS_API_KEY?: string;
  VITE_GOOGLE_MAPS_MAP_ID?: string;
  VITE_SMS_API_KEY?: string;
  VITE_SMS_SENDER_ID?: string;
  VITE_EMAIL_API_KEY?: string;
  VITE_EMAIL_FROM?: string;
};

export type Adapters = {
  payment: PaymentProvider;
  maps: { mode: "mock" | "google"; apiKey: string | null; mapId: string | null };
  sms: Notifier;
  email: Notifier;
  warnings: string[];
};

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export function isPlaceholder(value: string): boolean {
  if (!value) return true;
  return /^(your-|change-me|placeholder|xxx)/i.test(value);
}

export function isTestKey(value: string): boolean {
  return /(^|_)(test|sandbox)(_|$)|sk_test|pk_test|test_|sandbox/i.test(value);
}

function chargeTestCard(input: CardInput): ChargeResult {
  const judged = judgeTestCard(input);
  if (!judged.ok) return judged;
  return { ok: true, status: judged.status, last4: judged.last4 };
}

export function demoPaymentProvider(): PaymentProvider {
  return { id: "demo", testMode: true, label: "simulator", charge: chargeTestCard };
}

export function sandboxPaymentProvider(keys: { secret: string; publishable: string }): PaymentProvider {
  if (!isTestKey(keys.secret) || !isTestKey(keys.publishable)) {
    throw new Error("Sandbox payment adapter requires test keys");
  }
  return { id: "sandbox", testMode: true, label: "sandbox", charge: chargeTestCard };
}

function notifier(channel: "email" | "sms", mode: "mock" | "sandbox"): Notifier {
  return { channel, mode };
}

export function resolveAdapters(env: AdapterEnv): Adapters {
  const warnings: string[] = [];
  const mode = clean(env.VITE_PAYMENTS_MODE) || "sandbox";
  const secret = clean(env.VITE_PAYMENT_SECRET_KEY);
  const publishable = clean(env.VITE_PAYMENT_PUBLISHABLE_KEY);
  let payment = demoPaymentProvider();

  if (mode !== "sandbox") {
    warnings.push("PAYMENTS_MODE must stay sandbox. Live charges are disabled, so the in-browser TEST simulator is on.");
  } else if (!isPlaceholder(secret) || !isPlaceholder(publishable)) {
    if (!isPlaceholder(secret) && !isPlaceholder(publishable) && isTestKey(secret) && isTestKey(publishable)) {
      payment = sandboxPaymentProvider({ secret, publishable });
    } else {
      warnings.push("Payment keys are present but are not a sandbox pair. They were refused. The TEST simulator stays on.");
    }
  }

  const mapsKey = clean(env.VITE_GOOGLE_MAPS_API_KEY);
  const maps = !isPlaceholder(mapsKey)
    ? { mode: "google" as const, apiKey: mapsKey, mapId: clean(env.VITE_GOOGLE_MAPS_MAP_ID) || null }
    : { mode: "mock" as const, apiKey: null, mapId: null };

  const smsKey = clean(env.VITE_SMS_API_KEY);
  let sms = notifier("sms", "mock");
  if (!isPlaceholder(smsKey)) {
    if (isTestKey(smsKey)) sms = notifier("sms", "sandbox");
    else warnings.push("SMS key was refused because it is not a sandbox key. Codes stay in the in-app inbox.");
  }

  const emailKey = clean(env.VITE_EMAIL_API_KEY);
  let email = notifier("email", "mock");
  if (!isPlaceholder(emailKey)) {
    if (isTestKey(emailKey)) email = notifier("email", "sandbox");
    else warnings.push("Email key was refused because it is not a sandbox key. Messages stay in the in-app inbox.");
  }

  return { payment, maps, sms, email, warnings };
}
