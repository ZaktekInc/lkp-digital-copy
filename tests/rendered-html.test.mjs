import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};
const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders development preview metadata", async () => {
  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    env,
    ctx,
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("production artifact keeps local dev authorization disabled and protects admin routes", async () => {
  const anonymousAdmin = await worker.fetch(new Request("http://localhost/admin"), env, ctx);
  assert.equal(anonymousAdmin.status, 401);

  const ordinaryHeaders = {
    "oai-authenticated-user-id": "ordinary-user",
    "oai-authenticated-user-email": "ordinary@example.com",
  };
  const ordinaryAdmin = await worker.fetch(new Request("https://example.test/admin", { headers: ordinaryHeaders }), env, ctx);
  assert.equal(ordinaryAdmin.status, 403);

  const ordinaryAdminApi = await worker.fetch(new Request("https://example.test/api/admin/orders", { headers: ordinaryHeaders }), env, ctx);
  assert.equal(ordinaryAdminApi.status, 403);

  const ordinaryReferenceApi = await worker.fetch(new Request("https://example.test/api/admin/references/vendors", { headers: ordinaryHeaders }), env, ctx);
  assert.equal(ordinaryReferenceApi.status, 403);

  const ordinaryActivationApi = await worker.fetch(new Request("https://example.test/api/admin/activations", { headers: ordinaryHeaders }), env, ctx);
  assert.equal(ordinaryActivationApi.status, 403);

  const ordinaryOrganizationsApi = await worker.fetch(new Request("https://example.test/api/admin/organizations", { headers: ordinaryHeaders }), env, ctx);
  assert.equal(ordinaryOrganizationsApi.status, 403);

  const ordinaryProductsApi = await worker.fetch(new Request("https://example.test/api/admin/products", { headers: ordinaryHeaders }), env, ctx);
  assert.equal(ordinaryProductsApi.status, 403);

  const partialIdentity = await worker.fetch(new Request("http://localhost/admin", { headers: {
    "oai-authenticated-user-email": "seregaswimer@gmail.com",
  } }), env, ctx);
  assert.equal(partialIdentity.status, 401);

  const allowedAdmin = await worker.fetch(new Request("https://example.test/admin", { headers: {
    "oai-authenticated-user-id": "admin-user",
    "oai-authenticated-user-email": "seregaswimer@gmail.com",
  } }), env, ctx);
  assert.equal(allowedAdmin.status, 200);

  const anonymousOrders = await worker.fetch(new Request("https://example.test/api/orders"), env, ctx);
  assert.equal(anonymousOrders.status, 401);

  const builtWorker = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
  assert.match(builtWorker, /function localDevelopmentActor\(request\) \{\s*return null;\s*\}/);
});

test("client build does not contain server identity headers or the administrator allowlist", async () => {
  const clientDirectory = new URL("../dist/client/", import.meta.url);
  const files = await readdir(clientDirectory, { recursive: true });
  const javascript = await Promise.all(files.filter((file) => file.endsWith(".js")).map((file) => readFile(new URL(file.replaceAll("\\", "/"), clientDirectory), "utf8")));
  const clientBundle = javascript.join("\n").toLowerCase();
  assert.doesNotMatch(clientBundle, /seregaswimer@gmail\.com/);
  assert.doesNotMatch(clientBundle, /oai-authenticated-user-(?:id|email)/);
});
