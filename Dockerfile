FROM node:22.12.0-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api

RUN pnpm --filter @turismo/api build

WORKDIR /app/apps/api

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]