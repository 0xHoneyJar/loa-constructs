# Dockerfile for Loa Constructs API
# @see sdd.md §1.7 Deployment Architecture

# --- Build Stage ---
FROM oven/bun:1.2.22 AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN bun install

# Copy source code
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./

# Build shared package first, then API
WORKDIR /app/packages/shared
RUN bun run build

WORKDIR /app/apps/api
RUN bun run build

# Prune to production deps only (from workspace root)
WORKDIR /app
RUN rm -rf node_modules && bun install --production

# --- Production Stage ---
FROM oven/bun:1.2.22-alpine AS runner

# Install git (required by git-sync service for construct repo cloning)
RUN apk add --no-cache git

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Copy built dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist

# Copy production node_modules from builder (already pruned)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Run as non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/v1/health || exit 1

# Start the server
CMD ["bun", "run", "dist/index.js"]
