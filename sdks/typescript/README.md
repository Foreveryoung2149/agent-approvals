# Nodsend TypeScript SDK

An early TypeScript client for the canonical Nodsend approval API. It uses the
platform Fetch API, sends bearer credentials only to the configured Nodsend
origin, and requires an explicit idempotency key for approval creation.

```ts
import { Nodsend } from "@nodsend/sdk";

const nodsend = new Nodsend({ apiKey: process.env.NODSEND_API_KEY! });
const approval = await nodsend.approvals.create(
  {
    action: "deploy.production",
    summary: "Deploy release 1042 to production",
    recipient: "oncall@example.com",
  },
  "deploy-production-1042",
);
```

This package is a release candidate inside the Nodsend repository. Do not claim
registry availability until the package has been published and its provenance
has been verified.
