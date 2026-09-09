FROM node:22.12.0-alpine

WORKDIR /app

RUN npm install -g pnpm@10.32.1

COPY package.json ./

RUN printf 'onlyBuiltDependencies:\n  - sharp\n  - unrs-resolver\nallowBuilds:\n  sharp: true\n  unrs-resolver: true\n' > pnpm-workspace.yaml

RUN pnpm install --no-frozen-lockfile

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

EXPOSE 8080
ENV PORT=8080

CMD ["pnpm", "--filter", "@turismo/web", "start"]
