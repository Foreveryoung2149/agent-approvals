# Nodsend for OpenClaw (experimental)

This directory is a reviewable integration proposal, not a published or
OpenClaw-approved plugin. It uses OpenClaw's documented `before_tool_call` hook
to gate an explicit, operator-configured list of canonical tool ids.

## Safety model

- Enforcement happens before the tool executes.
- Only exact tool ids in `protectedTools` are gated; there are no wildcard or
  fuzzy policies.
- Nodsend API/network/config failures block protected calls.
- Sensitive-looking parameter keys are redacted and payload size is bounded.
- The API key is read only from `NODSEND_API_KEY`; it is never accepted in
  plugin config or included in approval details. The plugin always uses the
  canonical `https://api.nodsend.com` origin, so config cannot redirect the
  credential to another host.
- Idempotency derives from OpenClaw's tool call id when present. The fallback is
  a stable hash of agent/session/run identity and redacted canonical params.

## Important: remote-approval handoff is not implemented

OpenClaw's public hook contract does not guarantee that a tool call blocked
while waiting for a remote human can later resume in place. This proposal does
not invent that behavior. A protected call creates (or retrieves) the Nodsend
approval and is blocked. Calls remain blocked after a remote approval, with a
clear diagnostic, because a verified host-native consumption primitive is
still needed before execution can be safely enabled.

That final handoff is the explicit blocker for production/ClawHub publication.
The current package proves discovery, manifest validation, redaction,
idempotency, and fail-closed request behavior without claiming unsafe resume
semantics.

## Local review

```bash
cd sdks/typescript
npm install
npm test

cd ../../integrations/openclaw
npm install
npm test
```

For a local OpenClaw checkout, install with a linked development path, enable
the plugin, restart the active Gateway, and verify the live hook registration:

```bash
openclaw plugins install --link ./integrations/openclaw
openclaw plugins enable nodsend-approval-gate
openclaw gateway restart
openclaw plugins inspect nodsend-approval-gate --runtime --json
```

Example operator configuration:

```json5
{
  plugins: {
    allow: ["nodsend-approval-gate"],
    entries: {
      "nodsend-approval-gate": {
        enabled: true,
        config: {
          reviewerEmail: "oncall@example.com",
          protectedTools: ["exec", "apply_patch", "message"],
          expiresIn: "1h"
        }
      }
    }
  }
}
```

Set `NODSEND_API_KEY` in the Gateway environment. Do not paste it into plugin
configuration, prompts, tool parameters, logs, or approval details.

## Publication status

Do not market this as official, ClawHub-listed, or production-ready. Before
publishing:

1. agree a host-native consume/resume contract with OpenClaw maintainers;
2. implement single-use approval consumption and bind it to the exact tool call;
3. add integration tests against a supported OpenClaw Gateway release;
4. produce a packaged JavaScript artifact and pass OpenClaw's current plugin
   validation and security checks;
5. remove `private: true`, choose and verify the final package identity, and
   publish the dependency packages with provenance; and
6. run the current ClawHub package dry-run/review flow, then independently
   verify its listing before making any availability claim.
