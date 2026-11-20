import { describe, expect, it } from "vitest";
import { addMauritiusDays, formatWhen, mauritiusDayBounds, mauritiusTodayISO } from "./time";

describe("Mauritius civil time", () => {
  it("keeps the late evening on the same civil day", () => {
    expect(mauritiusTodayISO(new Date("2026-11-20T19:30:00Z"))).toBe("2026-11-20");
    expect(mauritiusTodayISO(new Date("2026-11-20T20:30:00Z"))).toBe("2026-11-21");
    const bounds = mauritiusDayBounds("2026-11-20");
    expect(bounds.startMs).toBe(Date.parse("2026-11-19T20:00:00Z"));
    expect(new Date("2026-11-20T19:30:00Z").getTime()).toBeGreaterThanOrEqual(bounds.startMs);
    expect(new Date("2026-11-20T19:30:00Z").getTime()).toBeLessThan(bounds.endMs);
    expect(new Date("2026-11-20T20:30:00Z").getTime()).toBeGreaterThanOrEqual(bounds.endMs);
  });

  it("adds days without drifting across midnight", () => {
    expect(addMauritiusDays("2026-11-20", 1)).toBe("2026-11-21");
  });

  it("formats the Mauritius clock", () => {
    const label = formatWhen("2026-11-20T19:30:00Z", "en");
    expect(label).toContain("23");
    expect(label).toContain("30");
  });
});
