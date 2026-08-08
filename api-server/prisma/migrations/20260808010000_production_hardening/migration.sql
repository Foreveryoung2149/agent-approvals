-- Authentication/session hardening.
CREATE TYPE "AuthCodeType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

ALTER TABLE "User"
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "twoFactorPendingSecret" TEXT;

-- Prototype TOTP secrets were plaintext. Do not silently continue using them;
-- affected users re-enrol with an encrypted secret after this deployment.
UPDATE "User"
SET "twoFactorEnabled" = false, "twoFactorSecret" = NULL
WHERE "twoFactorEnabled" = true
  AND "twoFactorSecret" IS NOT NULL
  AND "twoFactorSecret" NOT LIKE 'v1.%';

CREATE TABLE "AuthCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "AuthCodeType" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthCode_email_type_createdAt_idx" ON "AuthCode"("email", "type", "createdAt");
CREATE INDEX "AuthCode_expiresAt_idx" ON "AuthCode"("expiresAt");
ALTER TABLE "AuthCode" ADD CONSTRAINT "AuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Approval trust-boundary and SDK contract fields.
ALTER TABLE "Approval"
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "webhookId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "requestFingerprint" TEXT,
  ADD COLUMN "cancelIdempotencyKey" TEXT,
  ADD COLUMN "cancelRequestFingerprint" TEXT;

CREATE INDEX "Approval_userId_status_createdAt_idx" ON "Approval"("userId", "status", "createdAt");
CREATE UNIQUE INDEX "Approval_userId_idempotencyKey_key" ON "Approval"("userId", "idempotencyKey");
CREATE UNIQUE INDEX "Approval_userId_cancelIdempotencyKey_key" ON "Approval"("userId", "cancelIdempotencyKey");
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Durable approval-email delivery. The encrypted token is deleted after the
-- provider accepts the message, while delivery status remains auditable.
CREATE TABLE "ApprovalEmailDelivery" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "tokenCiphertext" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "error" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApprovalEmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApprovalEmailDelivery_approvalId_key" ON "ApprovalEmailDelivery"("approvalId");
CREATE INDEX "ApprovalEmailDelivery_status_nextAttemptAt_idx" ON "ApprovalEmailDelivery"("status", "nextAttemptAt");
ALTER TABLE "ApprovalEmailDelivery" ADD CONSTRAINT "ApprovalEmailDelivery_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Durable webhook outbox state and retry scheduling.
ALTER TABLE "WebhookDelivery"
  ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DELETE FROM "WebhookDelivery" a
USING "WebhookDelivery" b
WHERE a."approvalId" IS NOT NULL
  AND a."webhookId" = b."webhookId"
  AND a."approvalId" = b."approvalId"
  AND a."eventType" = b."eventType"
  AND (
    a."createdAt" > b."createdAt"
    OR (a."createdAt" = b."createdAt" AND a."id" > b."id")
  );

CREATE INDEX "WebhookDelivery_status_nextAttemptAt_idx" ON "WebhookDelivery"("status", "nextAttemptAt");
CREATE UNIQUE INDEX "WebhookDelivery_webhookId_approvalId_eventType_key" ON "WebhookDelivery"("webhookId", "approvalId", "eventType");
