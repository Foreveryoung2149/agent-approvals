---
name: nodsend-approvals
description: Create and manage human-in-the-loop approval requests for AI agent workflows via the Nodsend API.
---

# Nodsend Approvals

Create human-in-the-loop approval checkpoints for AI agent workflows.

## What this skill does

This skill allows an agent to pause execution and request a human decision before proceeding with a consequential action. The agent sends the action summary and recipient to the Nodsend API. Nodsend delivers the request (via email), the human clicks Approve or Reject, and the agent receives a signed webhook with the outcome.

## API endpoint

```
POST https://api.nodsend.com/v1/approvals
Authorization: Bearer appr_live_...
Content-Type: application/json
```

## Request body

```json
{
  "action": "deploy_production",
  "summary": "Release version 4.2 to production",
  "channel": "email",
  "recipient": "owner@company.com",
  "expires_in": "1h",
  "webhook_url": "https://your-agent.com/webhook"
}
```

## Response

```json
{
  "id": "appr_abc123",
  "status": "pending",
  "createdAt": "2026-08-09T00:00:00Z",
  "expiresAt": "2026-08-09T01:00:00Z"
}
```

## Webhook outcome

When the human decides, Nodsend sends a signed webhook:

```json
{
  "event": "approval.approved",
  "approvalId": "appr_abc123",
  "decidedBy": "owner@company.com",
  "decidedAt": "2026-08-09T00:05:00Z"
}
```

## Authentication

API keys are provisioned by a human workspace member at https://nodsend.com/dashboard/api-keys. Pass the key as a Bearer token in the Authorization header.

## Documentation

- [Developer docs](https://nodsend.com/docs)
- [OpenAPI spec](https://api.nodsend.com/openapi.yaml)
- [Auth.md](https://nodsend.com/auth.md)
