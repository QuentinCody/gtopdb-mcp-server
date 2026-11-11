import { afterEach, expect, it, vi } from "vitest";
import { gtopdbFetch } from "./http";
import { createGtopdbApiFetch } from "./api-adapter";
const apiKey = "synthetic/key+α";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("retains BOM, whitespace, Unicode, original byte hash and unpinned evidence", async () => {
  const native = { targetId: 54, unknown: { _mcp: true }, databaseLinks: [{ database: "HGNC", accession: "001" }, { database: "RGD", accession: "001" }, { database: "MGI", accession: "001" }] };
  const raw = "\uFEFF" + JSON.stringify(native) + "\r\n";
  const fetcher = vi.fn().mockResolvedValue(new Response(raw)); vi.stubGlobal("fetch", fetcher);
  const result = await createGtopdbApiFetch(apiKey)({ method: "GET", path: "/evidence/targets/54", params: { name: "α..β" } });
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))), byte => byte.toString(16).padStart(2, "0")).join("");
  expect(result.data).toMatchObject({ data: native, _mcp: { dataset_release: null, snapshot_pinned: false, completeness: { complete: false }, provenance: { raw_json: raw, response_bytes: new TextEncoder().encode(raw).length, response_sha256: hash, redacted: false, request: { path: "/targets/54", params: { name: "α..β" } } } } });
  expect(String(fetcher.mock.calls[0][0])).toBe("https://www.guidetopharmacology.org/services/targets/54?name=%CE%B1..%CE%B2");
  expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: "manual", headers: { Accept: "application/json", "GTP-API-Key": apiKey } });
});

it.each([401, 429, 503, 302, 206])("keeps redacted full error evidence without retrying %i", async status => {
  const raw = JSON.stringify({ literal: apiKey, encoded: encodeURIComponent(apiKey), escaped: "synthetic/key+\\u03b1", detail: "unrelated error" });
  const fetcher = vi.fn().mockResolvedValue(new Response(raw, { status, headers: { "retry-after": "60" } })); vi.stubGlobal("fetch", fetcher);
  const error = await gtopdbFetch("/targets/54", {}, { apiKey }).catch(error => error);
  expect(error).toMatchObject({ status, data: { upstream_http_status: status, retry_after: "60", provenance: { redacted: true, response_bytes: new TextEncoder().encode(raw).length } } });
  expect(JSON.stringify(error)).not.toContain(apiKey); expect(JSON.stringify(error)).not.toContain(encodeURIComponent(apiKey));
  expect(error.data.provenance.raw_json).toContain("unrelated error"); expect(fetcher).toHaveBeenCalledTimes(1);
});

it("rejects even a successful credential echo including JSON unicode escapes", async () => {
  const raw = '{"echo":"synthetic/key+\\u03b1"}';
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(raw)));
  await expect(gtopdbFetch("/targets", {}, { apiKey })).rejects.toMatchObject({ status: 502, data: { provenance: { redacted: true, raw_json: '{"echo":"[REDACTED]"}' } } });
});

it.each(["not json", "\uFEFF<error>α</error>"])("retains bounded malformed JSON evidence: %s", async raw => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(raw)));
  await expect(gtopdbFetch("/targets", {}, { apiKey })).rejects.toMatchObject({ status: 502, data: { provenance: { raw_json: raw } } });
});

it("rejects invalid UTF-8 and a partial 200 response", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(new Uint8Array([0xc3, 0x28]))).mockResolvedValueOnce(new Response("[]", { headers: { "content-range": "bytes 0-1/8" } })); vi.stubGlobal("fetch", fetcher);
  await expect(gtopdbFetch("/targets", {}, { apiKey })).rejects.toMatchObject({ status: 502 });
  await expect(gtopdbFetch("/targets", {}, { apiKey })).rejects.toMatchObject({ status: 502, data: { upstream_http_status: 200 } });
});

it.each([true, false])("bounds declared and streamed bytes (declared=%s)", async declared => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('"' + "α".repeat(20) + '"', { headers: declared ? { "content-length": "42" } : {} })));
  await expect(gtopdbFetch("/targets", {}, { apiKey, maxBytes: 32 })).rejects.toMatchObject({ status: 502 });
});

it.each(["headers", "body"])("enforces its deadline even if %s ignores abort and cancellation never resolves", async phase => {
  vi.useFakeTimers();
  const pending = new Promise<Response>(() => {});
  const response = new Response(new ReadableStream({ pull: () => new Promise(() => {}), cancel: () => new Promise(() => {}) }));
  vi.stubGlobal("fetch", vi.fn(() => phase === "headers" ? pending : Promise.resolve(response)));
  const done = expect(gtopdbFetch("/targets", {}, { apiKey, timeout: 10 })).rejects.toMatchObject({ status: 502 });
  await vi.advanceTimersByTimeAsync(11); await done;
});

it("retains native arrays for existing slice workflows", async () => {
  const rows = [{ targetId: 54 }, { targetId: 55 }]; vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(rows)));
  const result = await createGtopdbApiFetch(apiKey)({ method: "GET", path: "/targets" });
  expect((result.data as unknown[]).slice(0, 1)).toEqual([rows[0]]);
});
