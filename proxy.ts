import { NextResponse, type NextRequest } from "next/server";
import {
  acceptsMarkdown,
  CONTENT_SIGNAL,
  DISCOVERY_LINK_HEADER,
  isMarkdownRoute,
} from "./app/lib/agent-discovery";

function addDiscoveryHeaders(response: NextResponse, pathname: string) {
  response.headers.set("Content-Signal", CONTENT_SIGNAL);
  response.headers.set("Vary", "Accept");
  if (pathname === "/") {
    response.headers.set("Link", DISCOVERY_LINK_HEADER);
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const markdownRequested = (request.method === "GET" || request.method === "HEAD")
    && isMarkdownRoute(pathname)
    && acceptsMarkdown(request.headers.get("accept"));

  if (markdownRequested) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/.well-known/markdown";
    destination.search = "";
    const requestHeaders = new Headers(request.headers);
    // Next's rewrite URL is not reliably preserved in the App Router request URL.
    // Carry the source resource explicitly so every negotiated page renders itself.
    requestHeaders.set("x-nodsend-markdown-path", pathname);
    return addDiscoveryHeaders(NextResponse.rewrite(destination, {
      request: { headers: requestHeaders },
    }), pathname);
  }

  return addDiscoveryHeaders(NextResponse.next(), pathname);
}

export const config = {
  matcher: [
    "/",
    "/docs",
    "/pricing",
    "/faq",
    "/blog/:path*",
    "/contact",
    "/privacy",
    "/terms",
  ],
};
