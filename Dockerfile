# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/app ./app
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/components ./components
COPY --from=builder /app/models ./models
COPY --from=builder /app/types ./types
COPY --from=builder /app/bull-board.ts ./
COPY --from=builder /app/worker.ts ./

EXPOSE 3000
CMD ["npm", "start"]
