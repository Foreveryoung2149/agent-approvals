import type { NextConfig } from "next";

const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=yes";
const DISCOVERY_LINK = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '<https://api.nodsend.com/openapi.yaml>; rel="service-desc"; type="application/yaml"',
  '</docs>; rel="service-doc"; type="text/html"',
  '</auth.md>; rel="describedby"; type="text/markdown"',
  '</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json"',
].join(", ");

const negotiatedHeaders = [
  { key: "Content-Signal", value: CONTENT_SIGNAL },
  { key: "Vary", value: "Accept" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/",
        headers: [
          ...negotiatedHeaders,
          { key: "Link", value: DISCOVERY_LINK },
        ],
      },
      ...[
        "/docs",
        "/pricing",
        "/faq",
        "/blog",
        "/blog/:path*",
        "/contact",
        "/privacy",
        "/terms",
      ].map((source) => ({ source, headers: negotiatedHeaders })),
      {
        source: "/robots.txt",
        headers: [
          { key: "Content-Signal", value: CONTENT_SIGNAL },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          { key: "Content-Signal", value: CONTENT_SIGNAL },
        ],
      },
      {
        source: "/a/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/.well-known/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
