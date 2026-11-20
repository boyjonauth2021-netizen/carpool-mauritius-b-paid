import { describe, expect, it } from "vitest";
import { resolveAdapters } from "./adapters";

describe("adapter selection", () => {
  it("runs the in-browser simulator when no keys are set", () => {
    const adapters = resolveAdapters({});
    expect(adapters.payment.id).toBe("demo");
    expect(adapters.payment.testMode).toBe(true);
    expect(adapters.maps.mode).toBe("mock");
    expect(adapters.sms.mode).toBe("mock");
    expect(adapters.email.mode).toBe("mock");
    expect(adapters.warnings).toEqual([]);
  });

  it("arms the sandbox payment adapter only for a test key pair", () => {
    const armed = resolveAdapters({
      VITE_PAYMENTS_MODE: "sandbox",
      VITE_PAYMENT_SECRET_KEY: "sk_test_demo",
      VITE_PAYMENT_PUBLISHABLE_KEY: "pk_test_demo",
    });
    expect(armed.payment.id).toBe("sandbox");
    expect(armed.payment.testMode).toBe(true);
    const refused = resolveAdapters({
      VITE_PAYMENT_SECRET_KEY: "sk_live_nope",
      VITE_PAYMENT_PUBLISHABLE_KEY: "pk_live_nope",
    });
    expect(refused.payment.id).toBe("demo");
    expect(refused.warnings.join(" ")).toMatch(/refused/i);
  });

  it("refuses a live payments mode", () => {
    const adapters = resolveAdapters({ VITE_PAYMENTS_MODE: "live" });
    expect(adapters.payment.id).toBe("demo");
    expect(adapters.warnings.join(" ")).toMatch(/sandbox/i);
  });

  it("uses Google Maps only with a non-placeholder key, and sandbox inbox keys only when they look like test keys", () => {
    expect(resolveAdapters({ VITE_GOOGLE_MAPS_API_KEY: "your-google-maps-api-key" }).maps.mode).toBe("mock");
    expect(resolveAdapters({ VITE_GOOGLE_MAPS_API_KEY: "AIzaSyDemoKey1234567890" }).maps.mode).toBe("google");
    expect(resolveAdapters({ VITE_SMS_API_KEY: "sandbox-sms" }).sms.mode).toBe("sandbox");
    expect(resolveAdapters({ VITE_SMS_API_KEY: "live-provider-key" }).sms.mode).toBe("mock");
    expect(resolveAdapters({ VITE_EMAIL_API_KEY: "email_test_key" }).email.mode).toBe("sandbox");
  });

  it("does not echo a real card number from the charge path", () => {
    const { payment } = resolveAdapters({});
    const result = payment.charge({
      pan: "4111111111111111",
      expiry: "12/34",
      cvc: "123",
      amountCents: 12_000,
    });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("4111");
  });
});
