import { API_URL, fetchObjects, resolveImageUrl } from "@/lib/api";

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

describe("fetchObjects", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("requests /objects without query params when none are given", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, limit: 12 }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await fetchObjects();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/objects`,
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("appends page/limit as query params when given", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 2, limit: 5 }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await fetchObjects({ page: 2, limit: 5 });

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/objects?page=2&limit=5`,
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("parses the paginated envelope and computes hasMore", async () => {
    const items = [
      {
        _id: "1",
        title: "A",
        description: "d",
        imageUrl: "/a.png",
        createdAt: new Date().toISOString(),
      },
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items, total: 10, page: 1, limit: 1 }),
    }) as unknown as typeof fetch;

    const result = await fetchObjects({ page: 1, limit: 1 });

    expect(result).toEqual({ items, total: 10, page: 1, limit: 1, hasMore: true });
  });

  it("reports hasMore as false once every page has been fetched", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 2, page: 2, limit: 1 }),
    }) as unknown as typeof fetch;

    const result = await fetchObjects({ page: 2, limit: 1 });

    expect(result.hasMore).toBe(false);
  });

  describe("error message parsing on a failed response", () => {
    it("joins and capitalizes a class-validator array message", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          message: ["description must be longer than or equal to 10 characters"],
          error: "Bad Request",
          statusCode: 400,
        }),
      }) as unknown as typeof fetch;

      await expect(fetchObjects()).rejects.toThrow(
        "Description must be longer than or equal to 10 characters"
      );
    });

    it("joins multiple array messages with '; ' and capitalizes each", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          message: ["title should not be empty", "description must be longer than or equal to 10 characters"],
        }),
      }) as unknown as typeof fetch;

      await expect(fetchObjects()).rejects.toThrow(
        "Title should not be empty; Description must be longer than or equal to 10 characters"
      );
    });

    it("uses a plain string message directly", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Object not found", error: "Not Found", statusCode: 404 }),
      }) as unknown as typeof fetch;

      await expect(fetchObjects()).rejects.toThrow("Object not found");
    });

    it("falls back to the status text when the body is valid JSON but has no message field (e.g. an unrelated proxy error shape)", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 504,
        statusText: "Gateway Timeout",
        json: async () => ({ error: "Gateway Timeout", statusCode: 504 }),
      }) as unknown as typeof fetch;

      await expect(fetchObjects()).rejects.toThrow(
        "Request failed with status 504 Gateway Timeout"
      );
    });

    it("falls back to the status text when the body is an empty JSON object", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      }) as unknown as typeof fetch;

      await expect(fetchObjects()).rejects.toThrow(
        "Request failed with status 500 Internal Server Error"
      );
    });

    it("falls back to the status text when the body has no usable message", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("not json");
        },
        text: async () => "",
      }) as unknown as typeof fetch;

      await expect(fetchObjects()).rejects.toThrow(
        "Request failed with status 500 Internal Server Error"
      );
    });
  });
});
