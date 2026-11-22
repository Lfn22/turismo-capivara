# === Builder ===
FROM node:22.12.0-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.32.1

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter @turismo/web

COPY apps/web ./apps/web
RUN pnpm --filter @turismo/web build

# === Runtime ===
FROM node:22.12.0-alpine
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/package.json ./

USER nodejs
EXPOSE 3000
ENV NODE_ENV=production PORT=3000
CMD ["pnpm", "start"]
