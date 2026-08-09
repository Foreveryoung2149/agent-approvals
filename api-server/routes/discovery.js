import express from "express";
import path from "node:path";

export const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=yes";
export const API_CATALOG_PROFILE = "https://www.rfc-editor.org/info/rfc9727";

export const API_CATALOG = {
  linkset: [
    {
      anchor: "https://api.nodsend.com/",
      "service-desc": [
        { href: "https://api.nodsend.com/openapi.yaml", type: "application/yaml" },
      ],
      "service-doc": [
        { href: "https://nodsend.com/docs", type: "text/html" },
      ],
      status: [
        { href: "https://api.nodsend.com/health", type: "application/json" },
      ],
    },
  ],
};

export function createDiscoveryRouter({
  openApiPath = path.resolve(process.cwd(), "openapi", "nodsend.openapi.yaml"),
} = {}) {
  const router = express.Router();

  router.get("/.well-known/api-catalog", (_req, res) => {
    res.setHeader(
      "Content-Type",
      `application/linkset+json; profile="${API_CATALOG_PROFILE}"`,
    );
    res.setHeader(
      "Link",
      '<https://nodsend.com/.well-known/api-catalog>; rel="api-catalog"',
    );
    res.setHeader("Content-Signal", CONTENT_SIGNAL);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(JSON.stringify(API_CATALOG));
  });

  router.get("/openapi.yaml", (_req, res, next) => {
    res.type("application/yaml");
    res.setHeader("Content-Signal", CONTENT_SIGNAL);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(openApiPath, error => {
      if (error) next(error);
    });
  });

  return router;
}

export const discoveryRouter = createDiscoveryRouter();
