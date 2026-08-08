# Database migration deployment

New databases can run `prisma migrate deploy` directly. It applies the baseline,
the production-hardening migration, and the distributed-runtime migration for
database-backed rate limits and durable authentication-email delivery.

The original prototype used `prisma db push`, so an existing database has the
baseline tables but no Prisma migration history. Before the first deployment of
this version:

1. Take and verify a PostgreSQL backup.
2. Put API writes into maintenance mode.
3. Run `npx prisma migrate resolve --applied 20260808000000_baseline --schema api-server/prisma/schema.prisma` once against that database.
4. Run `npx prisma migrate deploy --schema api-server/prisma/schema.prisma`.
5. Deploy the API and complete a login, two-factor, approval, decision, and
   webhook smoke test.

The hardening migration preserves application data. Accounts that enabled 2FA
under the plaintext prototype are deliberately signed out and must enrol 2FA
again so their new secret is encrypted at rest.

Never run `prisma db push --accept-data-loss` against production.
