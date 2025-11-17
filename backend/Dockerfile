# Multi-stage Dockerfile for ELDERCARE+ Backend API
# Production-optimized build with security hardening

# ===== BUILD STAGE =====
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ===== PRODUCTION STAGE =====
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy production dependencies from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy migration files if they exist
COPY --chown=nestjs:nodejs src/database/migrations ./src/database/migrations 2>/dev/null || true

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]
