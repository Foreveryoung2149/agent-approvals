import {
  CONTENT_SIGNAL,
  estimateMarkdownTokens,
  isMarkdownRoute,
  markdownForPath,
} from "../../lib/agent-discovery";

function markdownResponse(pathname: string, includeBody: boolean) {
  if (!isMarkdownRoute(pathname)) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const markdown = markdownForPath(pathname);
  if (!markdown) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(includeBody ? markdown : null, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Location": pathname,
      "Content-Signal": CONTENT_SIGNAL,
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      "X-Robots-Tag": "noindex",
      "x-markdown-tokens": String(estimateMarkdownTokens(markdown)),
    },
  });
}

function requestedPath(request: Request) {
  const pathname = request.headers.get("x-nodsend-markdown-path")
    || new URL(request.url).searchParams.get("path")
    || "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function GET(request: Request) {
  return markdownResponse(requestedPath(request), true);
}

export function HEAD(request: Request) {
  return markdownResponse(requestedPath(request), false);
}
