FROM node:22.12.0-alpine

WORKDIR /app

RUN npm install -g pnpm@10.32.1

COPY package.json ./

RUN printf 'onlyBuiltDependencies:\n  - "@prisma/engines"\n  - esbuild\n  - prisma\nallowBuilds:\n  "@prisma/engines": true\n  esbuild: true\n  prisma: true\n' > pnpm-workspace.yaml

RUN pnpm install --no-frozen-lockfile

COPY . .

ENV NODE_ENV=production

RUN pnpm exec prisma generate
RUN pnpm build

EXPOSE 8080
ENV PORT=8080

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
