FROM node:22.12.0-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json ./

RUN pnpm install --no-frozen-lockfile

COPY . .

ENV NODE_ENV=production

RUN pnpm exec prisma generate
RUN pnpm build

EXPOSE 8080
ENV PORT=8080

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
