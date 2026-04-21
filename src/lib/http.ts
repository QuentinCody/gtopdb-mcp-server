import { restFetch } from "@bio-mcp/shared/http/rest-fetch";
import type { RestFetchOptions } from "@bio-mcp/shared/http/rest-fetch";

const GTOPDB_BASE = "https://www.guidetopharmacology.org/services";

export interface GtopdbFetchOptions extends Omit<RestFetchOptions, "retryOn"> {
    baseUrl?: string;
}

/**
 * Fetch from the Guide to PHARMACOLOGY (GtoPdb / IUPHAR) REST web services.
 *
 * Base URL: https://www.guidetopharmacology.org/services
 * Auth: none. Rate limits: undocumented — be polite.
 */
export async function gtopdbFetch(
    path: string,
    params?: Record<string, unknown>,
    opts?: GtopdbFetchOptions,
): Promise<Response> {
    const baseUrl = opts?.baseUrl ?? GTOPDB_BASE;
    const headers: Record<string, string> = {
        Accept: "application/json",
        ...(opts?.headers ?? {}),
    };

    return restFetch(baseUrl, path, params, {
        ...opts,
        headers,
        retryOn: [429, 500, 502, 503],
        retries: opts?.retries ?? 3,
        timeout: opts?.timeout ?? 30_000,
        userAgent: "gtopdb-mcp-server/1.0 (bio-mcp)",
    });
}
