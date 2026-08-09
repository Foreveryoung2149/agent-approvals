"use client";

import { useEffect } from "react";

/**
 * WebMCP — Expose site tools to AI agents via the browser
 * https://webmachinelearning.github.io/webmcp/
 *
 * Registers tools using navigator.modelContext.registerTool()
 * so browser-based agents can discover and invoke site capabilities.
 */
export default function WebMCPTools() {
  useEffect(() => {
    const nav = navigator as any;
    if (!nav.modelContext?.registerTool) return;

    const controller = new AbortController();
    const signal = controller.signal;

    nav.modelContext.registerTool(
      {
        name: "nodsend_search_docs",
        description:
          "Search the Nodsend developer documentation for information about the human approval API, webhooks, SDKs, and integrations.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for the documentation",
            },
          },
          required: ["query"],
        },
        execute: async (input: { query: string }) => {
          window.location.href = `/docs?q=${encodeURIComponent(input.query)}`;
          return { navigated: true, destination: "/docs" };
        },
      },
      { signal }
    );

    nav.modelContext.registerTool(
      {
        name: "nodsend_navigate",
        description:
          "Navigate to a specific page on the Nodsend website. Available pages: docs, pricing, faq, blog, contact, signup, login, dashboard.",
        inputSchema: {
          type: "object",
          properties: {
            page: {
              type: "string",
              enum: [
                "docs",
                "pricing",
                "faq",
                "blog",
                "contact",
                "signup",
                "login",
                "dashboard",
              ],
              description: "The page to navigate to",
            },
          },
          required: ["page"],
        },
        execute: async (input: { page: string }) => {
          window.location.href = `/${input.page}`;
          return { navigated: true, destination: `/${input.page}` };
        },
      },
      { signal }
    );

    nav.modelContext.registerTool(
      {
        name: "nodsend_get_api_info",
        description:
          "Get Nodsend API information including the base URL, authentication method, and available endpoints.",
        inputSchema: {
          type: "object",
          properties: {},
        },
        execute: async () => {
          return {
            api_base_url: "https://api.nodsend.com",
            auth_method: "Bearer API key",
            auth_header: "Authorization: Bearer appr_live_...",
            openapi_spec: "https://api.nodsend.com/openapi.yaml",
            docs: "https://nodsend.com/docs",
            endpoints: {
              create_approval: "POST /v1/approvals",
              get_approval: "GET /v1/approvals/:id",
              cancel_approval: "POST /v1/approvals/:id/cancel",
              list_approvals: "GET /v1/approvals",
            },
          };
        },
      },
      { signal }
    );

    return () => controller.abort();
  }, []);

  return null;
}
