import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VercelRequest, VercelResponse } from "@vercel/node";

const mockGet = vi.fn();

vi.mock("@upstash/redis", () => {
  return {
    Redis: class {
      get = mockGet;
    }
  };
});

describe("results API", () => {
  let req: Partial<VercelRequest>;
  let res: Partial<VercelResponse>;
  let jsonMock: any;
  let statusMock: any;
  let setHeaderMock: any;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = vi.fn();

    req = {
      method: "GET",
      query: {
        year: "2024",
        month: "5",
        division: "ipbl-66-m-pro-a"
      }
    };

    res = {
      status: statusMock,
      setHeader: setHeaderMock,
      headersSent: false
    };

    process.env.KV_REST_API_URL = "https://mock.url";
    process.env.KV_REST_API_TOKEN = "mock-token";

    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("should return 405 if method is not GET", async () => {
    const { default: handler } = await import("../results");
    req.method = "POST";

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(405);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Method not allowed" });
  });

  it("should return 400 for missing year", async () => {
    const { default: handler } = await import("../results");
    req.query = { month: "5", division: "ipbl-66-m-pro-a" };

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Missing or invalid year, month, or division" });
  });

  it("should return 400 for invalid division", async () => {
    const { default: handler } = await import("../results");
    req.query = { year: "2024", month: "5", division: "unknown-division" };

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Unknown division tag" });
  });

  it("should return 503 if KV is not configured", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const { default: handler } = await import("../results");

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining("KV/Redis REST is not configured"),
      code: "kv_env_missing"
    }));
  });

  it("should return 404 if data not in cache", async () => {
    mockGet.mockResolvedValue(null);
    const { default: handler } = await import("../results");

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining("No cached results yet"),
      key: "ipbl:results:2024:05:ipbl-66-m-pro-a",
      cold: true
    }));
  });

  it("should handle corrupt JSON in cache correctly", async () => {
    mockGet.mockResolvedValue("{ invalid json }");
    const { default: handler } = await import("../results");

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Cached results payload is corrupt JSON",
      key: "ipbl:results:2024:05:ipbl-66-m-pro-a"
    });
  });

  it("should return 200 with valid cached data", async () => {
    const validData = { some: "data" };
    mockGet.mockResolvedValue(JSON.stringify(validData));
    const { default: handler } = await import("../results");

    await handler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(setHeaderMock).toHaveBeenCalledWith("Cache-Control", expect.any(String));
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      meta: expect.objectContaining({
        source: "kv",
        year: 2024,
        month: 5,
        divisionTag: "ipbl-66-m-pro-a",
        key: "ipbl:results:2024:05:ipbl-66-m-pro-a"
      }),
      calendar: validData
    }));
  });
});
