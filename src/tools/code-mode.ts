import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSearchTool } from "@bio-mcp/shared/codemode/search-tool";
import { createExecuteTool } from "@bio-mcp/shared/codemode/execute-tool";
import { gtopdbCatalog } from "../spec/catalog";
import { createGtopdbApiFetch } from "../lib/api-adapter";

interface CodeModeEnv {
    GTOPDB_DATA_DO: DurableObjectNamespace;
    CODE_MODE_LOADER: WorkerLoader;
}

export function registerCodeMode(
    server: McpServer,
    env: CodeModeEnv,
): void {
    const apiFetch = createGtopdbApiFetch();

    const searchTool = createSearchTool({
        prefix: "gtopdb",
        catalog: gtopdbCatalog,
    });
    searchTool.register(server as unknown as { tool: (...args: unknown[]) => void });

    const executeTool = createExecuteTool({
        prefix: "gtopdb",
        catalog: gtopdbCatalog,
        apiFetch,
        doNamespace: env.GTOPDB_DATA_DO,
        loader: env.CODE_MODE_LOADER,
    });
    executeTool.register(server as unknown as { tool: (...args: unknown[]) => void });
}
