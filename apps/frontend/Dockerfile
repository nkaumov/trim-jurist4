# Use ECR Public mirror to avoid Docker Hub TLS/handshake issues.
FROM public.ecr.aws/docker/library/node:20-bookworm-slim AS base

WORKDIR /app

ENV NODE_ENV=production

COPY tsconfig.base.json tsconfig.base.json
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages packages

RUN npm ci --include=dev

COPY apps/frontend apps/frontend

RUN npm run -w frontend build

EXPOSE 3000

CMD ["npm", "run", "-w", "frontend", "start"]
