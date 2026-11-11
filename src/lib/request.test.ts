import { afterEach, expect, it, vi } from "vitest";
import { createGtopdbApiFetch } from "./api-adapter";
afterEach(() => vi.unstubAllGlobals());
it.each([
  { method: "POST", path: "/targets" }, { method: "GET", path: "/targets", body: {} },
  { method: "GET", path: "https://other.example/targets" }, { method: "GET", path: "/../targets" },
  { method: "GET", path: "/targets/%2e%2e/" }, { method: "GET", path: "/targets#fragment" },
  { method: "GET", path: "/evidence/targets/name" }, { method: "GET", path: "/evidence/ligands/54" },
  { method: "GET", path: "/targets?type=x&type=y" }, { method: "GET", path: "/targets?type=x", params: { type: "y" } },
  { method: "GET", path: "/targets", params: { "gtp-api-key": "user-supplied" } },
  { method: "GET", path: "/targets", params: { type: {} } }, { method: "GET", path: "/targets", params: { type: Number.POSITIVE_INFINITY } },
  { method: "GET", path: "/targets", params: { name: "α".repeat(20000) } },
])("rejects invalid requests before fetch %#", async request => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(createGtopdbApiFetch("synthetic-key")(request)).rejects.toHaveProperty("status");
  expect(fetcher).not.toHaveBeenCalled();
});
