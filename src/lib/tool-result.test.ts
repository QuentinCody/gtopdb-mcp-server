import { expect, it } from "vitest";
import { gtopdbResponse } from "./tool-result";

function storage() {
  const stored: unknown[] = [];
  const namespace = { idFromName: (name: string) => name, get: () => ({ fetch: async (request: Request) => {
    if (new URL(request.url).pathname === "/process") stored.push((await request.json() as { data: unknown }).data);
    return Response.json({ success: true, tables_created: ["payloads"], total_rows: 1, input_rows: 1, schema: { tables: {} } });
  } }) };
  return { stored, env: { GTOPDB_DATA_DO: namespace } };
}

it("stages the full Unicode envelope while preserving failure and citations", async () => {
  const original = { content: [{ type: "text" as const, text: "α😀".repeat(6000) }], structuredContent: { success: false, data: { article_id: "123", notes: "native evidence" } }, isError: true };
  const { stored, env } = storage();
  const result = await gtopdbResponse(async () => original, env, "mcp_gtopdb_execute", {}, { code: "fixture" });
  expect(result).toMatchObject({ isError: true, structuredContent: { success: false, staged: true, _staging: { evidence_table: "payloads" }, _meta: { citation: { source: { id: "gtopdb" }, result_scope: "staged:full_result" } } } });
  expect(stored.map(value => typeof value === "string" ? JSON.parse(value) : value)).toEqual(expect.arrayContaining([expect.objectContaining({ content: original.content, isError: true, structuredContent: expect.objectContaining({ data: original.structuredContent.data }) })]));
  expect(new TextEncoder().encode(JSON.stringify(result)).byteLength).toBeLessThan(30720);
});

it("returns a bounded cited error if staging storage is unavailable", async () => {
  const result = await gtopdbResponse(async () => ({ content: [{ type: "text", text: "α".repeat(20000) }], structuredContent: { success: true } }), {}, "gtopdb_execute", {});
  expect(result).toMatchObject({ content: expect.any(Array), isError: true, structuredContent: { success: false, error: { code: "RESPONSE_ERROR" }, _meta: { citation: { result_hash: expect.any(String) } } } });
});

it("reserves bytes for SDK metadata before the staging boundary", async () => {
  const size = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
  const raw = { content: [{ type: "text" as const, text: "Result" }], structuredContent: { data: "" } };
  const baseline = await gtopdbResponse(async () => raw, {}, "gtopdb_query_data", {});
  const original = { ...raw, structuredContent: { data: "x".repeat(30720 - size(baseline) - 512) } };
  const result = await gtopdbResponse(async () => original, storage().env, "gtopdb_query_data", {});
  expect(result.structuredContent).toMatchObject({ staged: true, _meta: { citation: { result_scope: "staged:full_result" } } });
  const wire = { ...result, resultType: "complete", _meta: { "io.modelcontextprotocol/serverInfo": { name: "gtopdb", version: "1" } } };
  expect(size(wire)).toBeLessThan(30720);
});

it("preserves upstream errors and marks partial executions as errors", async () => {
  const evidence = { native_error: "Path or Query Parameter error", response_evidence: { http_status: 400 } };
  const thrown = await gtopdbResponse(async () => { throw Object.assign(new Error("Native request failed"), { status: 400, data: evidence }); }, {}, "gtopdb_execute", {});
  expect(thrown).toMatchObject({ isError: true, structuredContent: { success: false, data: evidence, error: { status: 400 } } });
  for (const structuredContent of [{ success: true, disposition: "partial", data: { article_id: "123" } }, { data: { __api_error: true, status: 410 } }]) {
    const result = await gtopdbResponse(async () => ({ content: [], structuredContent }), {}, "gtopdb_execute", {});
    expect(result).toMatchObject({ isError: true, structuredContent: { success: false } });
  }
});
