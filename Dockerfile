# Multi-stage Dockerfile optimized for Hugging Face Spaces 24/7 runtime
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Build client production bundle
COPY . .
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860

# Hugging Face Spaces requires running as a non-root user with UID 1000
RUN apk add --no-cache curl \
    && adduser -D -u 1000 appuser

COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled assets and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/bot.py ./bot.py

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 7860

# Healthcheck for local and docker orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:7860/ping || exit 1

CMD ["node", "server.mjs"]
