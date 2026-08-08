# Nodsend OpenAPI contract

`nodsend.openapi.yaml` is the intended hardened v1 contract and the source of
truth for SDK behavior. It deliberately differs from the original prototype in
several security-critical ways:

- Agent API keys never authorize human decisions.
- Decision tokens are opaque and bound to exactly one approval.
- Writes require idempotency keys.
- Arbitrary callback URLs are replaced by registered webhook IDs.
- Slack is not advertised until a delivery implementation exists.
- Public decision responses are non-cacheable and use no-referrer protection.
- Webhook statuses and REST statuses use the same lowercase values.

Webhook requests use these headers:

```text
Nodsend-Webhook-Id: evt_...
Nodsend-Webhook-Timestamp: 1786204800
Nodsend-Webhook-Signature: v1=<hex HMAC-SHA256>
```

The signed bytes are:

```text
<event-id>.<unix-timestamp>.<exact-raw-request-body>
```

Do not mark the SDK generally available until the production server passes
contract tests against this file. The legacy `Approval-*` headers are supported
temporarily by the Python verifier for migration but are not part of v1.
