# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo prune --scope=@taskly/web --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# Important: NEXT_PUBLIC_* est lu au build par Next pour le code client.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm turbo build --filter=@taskly/web...

FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app /app
WORKDIR /app/apps/web

EXPOSE 8080
CMD ["sh", "-c", "node ./node_modules/next/dist/bin/next start -p ${PORT:-8080} -H 0.0.0.0"]


