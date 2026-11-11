import { afterEach, describe, expect, it, vi } from "vitest";
import { createGtopdbApiFetch } from "./api-adapter";

afterEach(() => vi.unstubAllGlobals());

describe("GtoPdb authenticated API contract", () => {
  it.each([undefined, "", "   "])("rejects missing configuration (%s) before network access", async (key) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(createGtopdbApiFetch(key)({ method: "GET", path: "/targets/54" }))
      .rejects.toThrow("GTOPDB_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the provider header, keeps credentials out of URLs, and preserves cross-references", async () => {
    const record = { targetId: 54, databaseLinks: [{ database: "HGNC", accession: "HGNC:4621" }] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(record));
    vi.stubGlobal("fetch", fetchMock);
    const result = await createGtopdbApiFetch("test-provider-key")({ method: "GET", path: "/targets/54" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://www.guidetopharmacology.org/services/targets/54");
    expect(new Headers(options.headers).get("GTP-API-Key")).toBe("test-provider-key");
    expect(result.data).toEqual(record);
    expect(result).toMatchObject({ status: 200, completeness: { complete: false }, upstreamTotal: null });
    expect(JSON.stringify(result)).not.toContain("test-provider-key");
  });

  it("propagates rejected credentials as an error without retrying 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("Invalid API key", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(createGtopdbApiFetch("invalid-test-key")({ method: "GET", path: "/targets/54" }))
      .rejects.toMatchObject({ status: 401, message: "GtoPdb HTTP 401", data: { upstream_http_status: 401, provenance: { raw_json: "Invalid API key" } } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
