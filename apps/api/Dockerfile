# === Builder ===
FROM node:22.12.0-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.32.1

COPY package.json ./
RUN printf 'onlyBuiltDependencies:\n  - "@prisma/engines"\n  - esbuild\n  - prisma\nallowBuilds:\n  "@prisma/engines": true\n  esbuild: true\n  prisma: true\n' > pnpm-workspace.yaml
RUN pnpm install --no-frozen-lockfile

COPY . .
ENV NODE_ENV=production
RUN pnpm exec prisma generate
RUN pnpm build

# === Runtime ===
FROM node:22.12.0-alpine
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs
EXPOSE 8080
ENV NODE_ENV=production PORT=8080
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
