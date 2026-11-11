import { fail, gtopdbRequest } from "./request";

export interface GtopdbFetchOptions { apiKey?: string; timeout?: number; maxBytes?: number; }

function redact(text: string, key: string): string {
  const replace = (input: string) => {
    let safe = input;
    for (const value of new Set([key, encodeURIComponent(key), JSON.stringify(key).slice(1, -1)])) safe = safe.split(value).join("[REDACTED]");
    return safe;
  };
  return replace(text.replace(/"(?:[^"\\]|\\.)*"/g, token => {
    try { const parsed = JSON.parse(token) as string; const safe = replace(parsed); return parsed === safe ? token : JSON.stringify(safe); }
    catch { return token; }
  }));
}

/** One fixed-host GET to https://www.guidetopharmacology.org/services; no retry or redirect. */
export async function gtopdbFetch(path: string, params?: Record<string, unknown>, opts: GtopdbFetchOptions = {}) {
  const built = gtopdbRequest({ method: "GET", path, params }, opts.apiKey);
  const controller = new AbortController();
  const maxBytes = opts.maxBytes ?? 4 * 1024 * 1024;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let response: Response | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("deadline")); }, opts.timeout ?? 50_000);
  });
  try {
    try {
      const pending = Promise.resolve(fetch(built.url, { method: "GET", headers: { Accept: "application/json", "GTP-API-Key": built.key }, redirect: "manual", signal: controller.signal })).then(value => {
        if (controller.signal.aborted) { void value.body?.cancel().catch(() => {}); throw new Error("deadline"); }
        return value;
      });
      response = await Promise.race([pending, expired]);
    } catch { fail("GtoPdb request failed or timed out", 502); }
    if (Number(response.headers.get("content-length")) > maxBytes) fail("GtoPdb response exceeds byte limit", 502);
    reader = response.body?.getReader();
    return await readGuideBody(reader, expired, maxBytes, built, response);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
    if (reader) void reader.cancel().catch(() => {});
    else if (response) void response.body?.cancel().catch(() => {});
  }
}

async function readGuideBody(reader: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>> | undefined, expired: Promise<never>, maxBytes: number, built: { url: URL; key: string; evidence: boolean; request: { method: string; path: string; params: { [k: string]: string; }; }; }, response: Response) {
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (reader) {
      const { value, done } = await Promise.race([reader.read(), expired]); if (done) break;
      size += value.byteLength; if (size > maxBytes) fail("Response exceeds byte limit", 502);
      chunks.push(value);
    }
  } catch { fail("GtoPdb response unreadable, timed out or exceeds byte limit", 502); }
  const bytes = new Uint8Array(size); const { data, provenance } = await decodeGuideResponse(chunks, bytes, built, size, response);
  return { status: response.status, data, provenance, evidence: built.evidence };
}

async function decodeGuideResponse(chunks: Uint8Array<ArrayBufferLike>[], bytes: Uint8Array<ArrayBuffer>, built: { url: URL; key: string; evidence: boolean; request: { method: string; path: string; params: { [k: string]: string; }; }; }, size: number, response: Response) {
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let original: string;
  try { original = (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? "\uFEFF" : "") + new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes); }
  catch { fail("GtoPdb returned invalid UTF-8", 502); }
  const raw = redact(original, built.key);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const provenance = {
    source_url: built.url.toString(), request: built.request, retrieved_at: new Date().toISOString(),
    response_sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join(""),
    response_bytes: size, raw_json: raw, redacted: raw !== original
  };
  const retry = response.headers.get("retry-after");
  const evidence = { upstream_http_status: response.status, retry_after: retry === null ? null : redact(retry, built.key), provenance };
  if (response.status !== 200 || response.headers.has("content-range")) fail(`GtoPdb HTTP ${response.status}`, response.status === 200 ? 502 : response.status, evidence);
  let data: unknown;
  try { data = JSON.parse(raw.replace(/^\uFEFF/, "")); }
  catch { fail("GtoPdb returned invalid JSON", 502, evidence); }
  if (raw !== original) fail("GtoPdb response unexpectedly contains a credential", 502, evidence);
  return { data, provenance };
}
