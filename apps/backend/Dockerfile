# Use ECR Public mirror to avoid Docker Hub TLS/handshake issues.
FROM public.ecr.aws/docker/library/node:20-bookworm-slim AS base

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/juri4?schema=public

COPY tsconfig.base.json tsconfig.base.json
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages packages

RUN npm ci --include=dev

COPY prisma prisma
RUN npx prisma generate --schema=prisma/schema.prisma

COPY apps/backend apps/backend
RUN npm run -w backend build

EXPOSE 4000

CMD ["npm", "run", "-w", "backend", "start"]
