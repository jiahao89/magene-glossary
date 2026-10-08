# ==============================================================================
# GlossaHub v2.0 - Production Multi-Stage Dockerfile (TASK-1301)
# ==============================================================================

# Stage 1: Build Frontend Web Application
FROM node:20-alpine AS client-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit
COPY tsconfig*.json vite.config.ts ./
COPY client ./client
RUN npm run build:client

# Stage 2: Build Backend Server
FROM node:20-alpine AS server-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit
COPY tsconfig*.json ./
COPY server ./server
RUN npm run build:server

# Stage 3: Lightweight Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline --no-audit && npm cache clean --force

# Copy compiled artifacts
COPY --from=server-builder /app/dist/server ./server
COPY --from=client-builder /app/dist/client ./public

# Non-root user for security
USER node

EXPOSE 3000

CMD ["node", "server/src/app.js"]
