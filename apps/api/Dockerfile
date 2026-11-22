# === Builder ===
FROM node:22.12.0-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.32.1

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter @turismo/api

COPY apps/api ./apps/api
RUN pnpm --filter @turismo/api exec prisma generate
RUN pnpm --filter @turismo/api build

# === Runtime ===
FROM node:22.12.0-alpine
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./

USER nodejs
EXPOSE 8080
ENV NODE_ENV=production PORT=8080
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
