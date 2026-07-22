import { formatFullDateTime, formatRelativeTime } from "@/lib/format-date";

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-07-21T12:00:00Z");

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("formats a few seconds ago", () => {
    const date = new Date(NOW.getTime() - 30 * 1000);
    expect(formatRelativeTime(date)).toBe("30 seconds ago");
  });

  it("formats minutes ago", () => {
    const date = new Date(NOW.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("5 minutes ago");
  });

  it("formats hours ago", () => {
    const date = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("2 hours ago");
  });

  it("formats days ago", () => {
    const date = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("3 days ago");
  });

  it("formats a future time", () => {
    const date = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("in 2 hours");
  });

  it("accepts an ISO string input", () => {
    const isoString = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(isoString)).toBe("5 minutes ago");
  });
});

describe("formatFullDateTime", () => {
  // NOTE: toLocaleDateString/toLocaleTimeString below resolve against the
  // host's local timezone, and this environment's Jest/jsdom setup does not
  // reliably honor a mid-test `process.env.TZ` override (the ICU timezone
  // gets resolved to the host default before the test file runs). Rather
  // than depend on an unpinnable timezone, the expected strings are derived
  // from the same locale APIs the implementation uses, which still exercises
  // the real join/format logic (separator, options, string-vs-Date input).
  function expectedFullDateTime(date: Date): string {
    const datePart = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${datePart} · ${timePart}`;
  }

  it("formats a fixed Date object", () => {
    const date = new Date("2026-07-21T14:32:00Z");
    expect(formatFullDateTime(date)).toBe(expectedFullDateTime(date));
  });

  it("accepts an ISO string input", () => {
    const isoString = "2025-01-05T08:05:00Z";
    expect(formatFullDateTime(isoString)).toBe(
      expectedFullDateTime(new Date(isoString))
    );
  });

  it("separates the date and time with a middle dot", () => {
    const date = new Date("2026-07-21T14:32:00Z");
    expect(formatFullDateTime(date)).toContain(" · ");
  });
});
