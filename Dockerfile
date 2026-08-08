FROM node:22-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install OpenSSL so Prisma can detect the correct SSL version
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate --schema api-server/prisma/schema.prisma
RUN npm run build

# Make start script executable
RUN chmod +x start.sh

EXPOSE 3000
CMD ["./start.sh"]