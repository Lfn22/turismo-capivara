FROM node:22.12.0-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./

RUN pnpm install --no-frozen-lockfile

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

EXPOSE 8080
ENV PORT=8080

CMD ["pnpm", "start"]
