import { CONTENT_SIGNAL } from "../lib/agent-discovery";

const authDocument = `# auth.md

Nodsend is a human-approval API for server-side AI-agent workflows.

## Agent audience

This service authenticates agents and services operated by an existing Nodsend workspace. Credential provisioning is interactive and human-initiated.

## Registration and provisioning

Nodsend uses human-provisioned API keys. There is no OAuth token exchange, dynamic client registration, or automated agent self-registration.

### How to register

1. A human workspace owner creates an account at https://nodsend.com/signup and verifies the account email.
2. An authenticated workspace member provisions an API key at https://nodsend.com/dashboard/api-keys.
3. The key is copied once into the application's server-side secret store.
4. The application uses that key to call https://api.nodsend.com/v1/approvals.

Provisioning requires an interactive human account. Agents must not attempt to automate signup, email verification, dashboard login, or key creation.

## Agent registration profile

The following machine-readable profile describes Nodsend's supported registration path:

\`\`\`yaml
agent_auth:
  skill: "https://nodsend.com/auth.md"
  audience: "AI agents and server-side services operated by a Nodsend workspace"
  register_uri: "https://nodsend.com/signup"
  claim_uri: "https://nodsend.com/dashboard/api-keys"
  automated_registration_supported: false
  registration_methods:
    - type: "human_provisioned_api_key"
      interactive: true
      register_uri: "https://nodsend.com/signup"
      provision_uri: "https://nodsend.com/dashboard/api-keys"
      claim_uri: "https://nodsend.com/dashboard/api-keys"
      credential_types_supported:
        - "api_key"
      bearer_methods_supported:
        - "header"
      authorization_header: "Authorization: Bearer appr_live_..."
  identity_types_supported:
    - "anonymous"
  anonymous:
    credential_types_supported:
      - "api_key"
    claim_uri: "https://nodsend.com/dashboard/api-keys"
\`\`\`

\`register_uri\` starts an interactive account flow and \`provision_uri\` requires an authenticated workspace member. Neither URI is an agent-callable registration API.

## Supported authentication method

- **Method**: Bearer API key
- **Header**: \`Authorization: Bearer appr_live_...\`
- **API base URL**: \`https://api.nodsend.com\`
- **OpenAPI description**: https://api.nodsend.com/openapi.yaml
- **Human documentation**: https://nodsend.com/docs
- **Protected Resource Metadata**: https://nodsend.com/.well-known/oauth-protected-resource
- **Authorization Server Metadata**: https://nodsend.com/.well-known/oauth-authorization-server

API keys belong only in a trusted server process or secrets manager. Never place one in a browser, model prompt, public URL, approval context, support request, or client-side bundle.

## Credential lifecycle

Workspace members create, identify, and revoke API keys in the dashboard. Rotate a key immediately if it is exposed. Approval decision links are separate, single-use human credentials; an agent API key never grants authority to approve its own request.

## Support

For provisioning or security questions, use https://nodsend.com/contact. Do not send credentials in a support message.
`;

function response(includeBody: boolean) {
  return new Response(includeBody ? authDocument : null, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": CONTENT_SIGNAL,
      "Content-Type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(Math.ceil(authDocument.length / 4)),
    },
  });
}

export function GET() {
  return response(true);
}

export function HEAD() {
  return response(false);
}
