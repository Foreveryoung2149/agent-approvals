import type { MetadataRoute } from "next";
import { blogPosts } from "./blog/posts";

const routes = ["", "/docs", "/pricing", "/faq", "/blog", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const staticRoutes: MetadataRoute.Sitemap = routes.map((route, index) => ({
    url: `https://nodsend.com${route}`,
    lastModified,
    changeFrequency: route === "/blog" ? "weekly" : "monthly",
    priority: index === 0 ? 1 : route === "/docs" ? 0.9 : 0.7,
  }));

  const articleRoutes: MetadataRoute.Sitemap = blogPosts.map(post => ({
    url: `https://nodsend.com/blog/${post.slug}`,
    lastModified: new Date(`${post.publishedAt}T00:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  return [...staticRoutes, ...articleRoutes];
}
