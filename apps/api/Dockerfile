# Dockerfile for Loa Constructs API
# @see sdd.md §1.7 Deployment Architecture
# @see sprint.md T1.6: Fly.io Deployment

# --- Build Stage ---
FROM node:20-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy root package files for workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

# Build the API
WORKDIR /app/apps/api
RUN pnpm build

# --- Production Stage ---
FROM node:20-alpine AS runner

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Copy built application and lockfile
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod

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
CMD ["node", "dist/index.js"]
