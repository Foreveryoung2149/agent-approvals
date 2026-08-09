import { NextResponse } from "next/server";

/**
 * OAuth Authorization Server Metadata (RFC 8414)
 * https://datatracker.ietf.org/doc/html/rfc8414
 *
 * Nodsend uses human-provisioned API keys rather than OAuth token flows.
 * This metadata document advertises the agent_auth block so scanners
 * can discover the registration path programmatically.
 */

const metadata = {
  issuer: "https://nodsend.com",
  authorization_endpoint: "https://nodsend.com/signup",
  token_endpoint: "https://nodsend.com/dashboard/api-keys",
  scopes_supported: ["approvals:create", "approvals:read", "approvals:cancel"],
  response_types_supported: ["none"],
  grant_types_supported: ["none"],
  service_documentation: "https://nodsend.com/docs",
  agent_auth: {
    skill: "https://nodsend.com/auth.md",
    register_uri: "https://nodsend.com/signup",
    claim_uri: "https://nodsend.com/dashboard/api-keys",
    automated_registration_supported: false,
    registration_methods: [
      {
        type: "human_provisioned_api_key",
        interactive: true,
        register_uri: "https://nodsend.com/signup",
        provision_uri: "https://nodsend.com/dashboard/api-keys",
        claim_uri: "https://nodsend.com/dashboard/api-keys",
        credential_types_supported: ["api_key"],
        bearer_methods_supported: ["header"],
        authorization_header: "Authorization: Bearer appr_live_...",
      },
    ],
    identity_types_supported: ["anonymous"],
    anonymous: {
      credential_types_supported: ["api_key"],
      claim_uri: "https://nodsend.com/dashboard/api-keys",
    },
  },
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
