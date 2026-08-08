CREATE TYPE "ApiKeyMode" AS ENUM ('LIVE', 'TEST');

ALTER TABLE "ApiKey"
  ADD COLUMN "mode" "ApiKeyMode" NOT NULL DEFAULT 'LIVE';

-- Prototype test keys already encode their mode in the non-secret prefix.
UPDATE "ApiKey"
SET "mode" = 'TEST'
WHERE "keyPrefix" LIKE 'appr_test_%';
