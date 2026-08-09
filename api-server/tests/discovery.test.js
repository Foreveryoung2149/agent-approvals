import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import path from "node:path";

import { createDiscoveryRouter } from "../routes/discovery.js";

async function withDiscoveryServer(run) {
  const app = express();
  app.use(createDiscoveryRouter({
    openApiPath: path.resolve(process.cwd(), "openapi", "nodsend.openapi.yaml"),
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => (
      error ? reject(error) : resolve()
    )));
  }
}

test("API catalog is an RFC 9727 profiled JSON linkset", async () => {
  await withDiscoveryServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/.well-known/api-catalog`);
    const catalog = await response.json();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^application\/linkset\+json/);
    assert.match(response.headers.get("content-type"), /rfc9727/);
    assert.equal(response.headers.get("content-signal"), "ai-train=no, search=yes, ai-input=yes");
    assert.equal(catalog.linkset[0].anchor, "https://api.nodsend.com/");
    assert.equal(catalog.linkset[0]["service-desc"][0].href, "https://api.nodsend.com/openapi.yaml");
    assert.equal(catalog.linkset[0]["service-doc"][0].href, "https://nodsend.com/docs");
    assert.equal(catalog.linkset[0].status[0].href, "https://api.nodsend.com/health");

    const head = await fetch(`${baseUrl}/.well-known/api-catalog`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.match(head.headers.get("link"), /rel="api-catalog"/);
    assert.equal(await head.text(), "");
  });
});

test("published OpenAPI description is retrievable as YAML", async () => {
  await withDiscoveryServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/openapi.yaml`);
    const specification = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^application\/yaml/);
    assert.equal(response.headers.get("content-signal"), "ai-train=no, search=yes, ai-input=yes");
    assert.match(specification, /^openapi: 3\.1\.0/m);
    assert.match(specification, /https:\/\/api\.nodsend\.com/);
  });
});
