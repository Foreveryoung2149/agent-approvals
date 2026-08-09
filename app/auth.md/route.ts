import { CONTENT_SIGNAL } from "../lib/agent-discovery";

const authDocument = `# Nodsend auth.md

Nodsend is a human-approval API for server-side AI-agent workflows.

## Agent audience

This authentication method is for agents and services operated by an existing Nodsend workspace. It is not an unattended agent-registration protocol.

## Registration and provisioning

Nodsend does not currently offer OAuth, dynamic client registration, anonymous credentials, or automated agent self-registration.

1. A human workspace owner creates an account at https://nodsend.com/signup and verifies the account email.
2. An authenticated workspace member provisions an API key at https://nodsend.com/dashboard/api-keys.
3. The key is copied once into the application's server-side secret store.
4. The application uses that key to call https://api.nodsend.com/v1/approvals.

Provisioning requires an interactive human account. Agents must not attempt to automate signup, email verification, dashboard login, or key creation.

## Supported authentication method

- Method: Bearer API key
- Header: \`Authorization: Bearer appr_live_...\`
- API base URL: \`https://api.nodsend.com\`
- OpenAPI description: https://api.nodsend.com/openapi.yaml
- Human documentation: https://nodsend.com/docs

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
