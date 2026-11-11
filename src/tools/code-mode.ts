import type { McpServer } from "@bio-mcp/shared/mcp";
import { createSearchTool } from "@bio-mcp/shared/codemode/search-tool";
import { createExecuteTool } from "@bio-mcp/shared/codemode/execute-tool";
import { gtopdbCatalog } from "../spec/catalog";
import { createGtopdbApiFetch } from "../lib/api-adapter";
import { gtopdbResponse, GTOPDB_SOURCE } from "../lib/tool-result";

interface CodeModeEnv {
    GTOPDB_API_KEY?: string;
    GTOPDB_DATA_DO: DurableObjectNamespace;
    CODE_MODE_LOADER: WorkerLoader;
}

export function registerCodeMode(
    server: McpServer,
    env: CodeModeEnv,
): void {
    const apiFetch = createGtopdbApiFetch(env.GTOPDB_API_KEY);
    const registrar = { tool: (...args: unknown[]) => {
        const [name, ...rest] = args;
        const handler = rest.pop() as (args: unknown, extra: unknown) => ReturnType<typeof gtopdbResponse>;
        const register = server.tool.bind(server) as (...values: unknown[]) => void;
        for (const alias of [String(name), `mcp_${String(name)}`]) register(alias, ...rest, (args: unknown, extra: unknown) => gtopdbResponse(() => handler(args, extra), env, alias, extra, args));
    } };

    const searchTool = createSearchTool({
        prefix: "gtopdb",
        catalog: gtopdbCatalog,
    });
    searchTool.register(registrar);

    const executeTool = createExecuteTool({
        prefix: "gtopdb",
        // Verifiable provenance: gtopdb_execute results carry a _meta.citation.
        source: GTOPDB_SOURCE,
        catalog: gtopdbCatalog,
        apiFetch,
        maxInlineBytes: 30 * 1024,
        stagingThreshold: 30 * 1024,
        preserveApiErrors: true,
        timeout: 90_000,
        doNamespace: env.GTOPDB_DATA_DO,
        loader: env.CODE_MODE_LOADER,
    });
    executeTool.register(registrar);
}
