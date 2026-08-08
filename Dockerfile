FROM node:22-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package*.json ./
COPY api-server/prisma/schema.prisma ./api-server/prisma/schema.prisma
RUN npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodsend \
    && useradd --system --uid 1001 --gid nodsend nodsend

COPY --from=builder --chown=nodsend:nodsend /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=nodsend:nodsend /app/node_modules ./node_modules
COPY --from=builder --chown=nodsend:nodsend /app/.next ./.next
COPY --from=builder --chown=nodsend:nodsend /app/public ./public
COPY --from=builder --chown=nodsend:nodsend /app/api-server ./api-server
COPY --from=builder --chown=nodsend:nodsend --chmod=755 /app/start.sh ./start.sh

USER nodsend
EXPOSE 3000 3002
CMD ["./start.sh"]
