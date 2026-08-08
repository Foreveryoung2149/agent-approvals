-- Distributed, atomic fixed-window rate-limit counters.
CREATE TABLE "RateLimitBucket" (
    "key" VARCHAR(64) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- Durable verification/password-reset email delivery. The raw six-digit code
-- is encrypted with the application encryption key and erased after use.
CREATE TABLE "AuthEmailDelivery" (
    "id" TEXT NOT NULL,
    "authCodeId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipientName" TEXT,
    "codeCiphertext" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "error" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthEmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthEmailDelivery_authCodeId_key" ON "AuthEmailDelivery"("authCodeId");
CREATE INDEX "AuthEmailDelivery_status_nextAttemptAt_idx" ON "AuthEmailDelivery"("status", "nextAttemptAt");

ALTER TABLE "AuthEmailDelivery"
  ADD CONSTRAINT "AuthEmailDelivery_authCodeId_fkey"
  FOREIGN KEY ("authCodeId") REFERENCES "AuthCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
