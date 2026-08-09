import { NextResponse } from "next/server";

/**
 * OAuth Protected Resource Metadata (RFC 9728)
 * https://datatracker.ietf.org/doc/html/rfc9728
 *
 * This endpoint advertises how agents authenticate to the Nodsend API.
 * Nodsend uses human-provisioned API keys (not OAuth flows), so
 * authorization_servers points back to our own auth.md document.
 */

const metadata = {
  resource: "https://api.nodsend.com",
  authorization_servers: ["https://nodsend.com"],
  scopes_supported: ["approvals:create", "approvals:read", "approvals:cancel"],
  bearer_methods_supported: ["header"],
  resource_documentation: "https://nodsend.com/docs",
  resource_signing_alg_values_supported: ["HS256"],
};

function response(includeBody: boolean) {
  return new NextResponse(includeBody ? JSON.stringify(metadata, null, 2) : null, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export function GET() {
  return response(true);
}

export function HEAD() {
  return response(false);
}
