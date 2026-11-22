# === Builder ===
FROM node:22.12.0-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.32.1

COPY package.json ./
RUN printf 'onlyBuiltDependencies:\n  - sharp\n  - unrs-resolver\nallowBuilds:\n  sharp: true\n  unrs-resolver: true\n' > pnpm-workspace.yaml
RUN pnpm install --no-frozen-lockfile

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm build

# === Runtime ===
FROM node:22.12.0-alpine
WORKDIR /app
RUN npm install -g pnpm@10.32.1

RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs
COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs
EXPOSE 8080
ENV NODE_ENV=production PORT=8080
CMD ["pnpm", "start"]
