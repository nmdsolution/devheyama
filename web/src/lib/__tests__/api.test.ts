import { API_URL, resolveImageUrl } from "@/lib/api";

describe("resolveImageUrl", () => {
  it("returns an empty string for an empty input", () => {
    expect(resolveImageUrl("")).toBe("");
  });

  it("passes through an absolute http(s) URL unchanged", () => {
    expect(resolveImageUrl("https://example.com/image.png")).toBe(
      "https://example.com/image.png"
    );
    expect(resolveImageUrl("http://example.com/image.png")).toBe(
      "http://example.com/image.png"
    );
  });

  it("prefixes a relative path that starts with a slash with the API base", () => {
    expect(resolveImageUrl("/uploads/image.png")).toBe(
      `${API_URL}/uploads/image.png`
    );
  });

  it("prefixes a relative path without a leading slash with the API base", () => {
    expect(resolveImageUrl("uploads/image.png")).toBe(
      `${API_URL}/uploads/image.png`
    );
  });
});
