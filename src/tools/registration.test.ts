import { afterEach, expect, it, vi } from "vitest";
import { McpServer } from "@bio-mcp/shared/mcp";
import { createApiProxyTool } from "@bio-mcp/shared/tools/api-proxy";
import { registerCodeMode } from "./code-mode";
import { registerGetSchema } from "./get-schema";
import { registerQueryData } from "./query-data";
import { gtopdbCatalog } from "../spec/catalog";
import { createGtopdbApiFetch } from "../lib/api-adapter";
afterEach(() => vi.unstubAllGlobals());

it("registers every tool under both aliases and returns both fields on errors", async () => {
  const server = new McpServer({ name: "fixture", version: "1" });
  registerCodeMode(server, { CODE_MODE_LOADER: { get: () => ({}) } } as unknown as Parameters<typeof registerCodeMode>[1]);
  registerGetSchema(server, {}); registerQueryData(server, {});
  const tools = (server as unknown as { _registeredTools: Record<string, { handler: (args: unknown, extra: unknown) => Promise<unknown> }> })._registeredTools;
  for (const prefix of ["", "mcp_"]) {
    for (const suffix of ["search", "execute", "query_data", "get_schema"]) expect(tools[`${prefix}gtopdb_${suffix}`]).toBeDefined();
    expect(await tools[`${prefix}gtopdb_search`].handler({ query: "HGNC", max_results: 5 }, {})).toMatchObject({ content: expect.any(Array), structuredContent: { success: true } });
    expect(await tools[`${prefix}gtopdb_query_data`].handler({ data_access_id: "fixture", sql: "SELECT 1" }, {})).toMatchObject({ isError: true, content: expect.any(Array), structuredContent: { _meta: { citation: { result_hash: expect.any(String) } } } });
  }
});

it("retains an entire evidence packet and unknown completeness in an API staging handle", async () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ targetId: 54, ligandId: i, note: "Synthetic α😀 ".repeat(250) }));
  const raw = JSON.stringify(rows); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(raw)));
  const stored: unknown[] = [];
  const namespace = { idFromName: (name: string) => name, get: () => ({ fetch: async (request: Request) => {
    if (new URL(request.url).pathname === "/process") stored.push((await request.json() as { data: unknown }).data);
    return Response.json({ success: true, tables_created: ["payloads"], total_rows: 1, input_rows: 1, schema: { tables: {} } });
  } }) } as unknown as DurableObjectNamespace;
  const proxy = createApiProxyTool({ apiFetch: createGtopdbApiFetch("synthetic-key"), catalog: gtopdbCatalog, doNamespace: namespace, stagingPrefix: "gtopdb", maxInlineBytes: 30 * 1024 });
  const result = await proxy.handler({ method: "GET", path: "/evidence/targets/54/interactions" }, { sql: () => [] });
  expect(result).toMatchObject({ __staged: true, _staging: { completeness: { complete: false } } });
  expect(JSON.parse(stored[0] as string)).toMatchObject({ data: rows, _mcp: { provenance: { raw_json: raw }, snapshot_pinned: false } });
  expect(JSON.stringify(stored)).not.toContain("synthetic-key");
});
