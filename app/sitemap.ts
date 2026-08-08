import type { MetadataRoute } from "next";

const routes = ["", "/docs", "/pricing", "/faq", "/blog"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((route, index) => ({
    url: `https://nodsend.com${route}`,
    lastModified,
    changeFrequency: route === "/blog" ? "weekly" : "monthly",
    priority: index === 0 ? 1 : route === "/docs" ? 0.9 : 0.7,
  }));
}
