# ==============================================================================
# Nexus Compliance Engine - Production Dockerfile
# Multi-stage build for EU Regulatory Compliance Plugin
# ==============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Verify build output
RUN ls -la dist/

# ==============================================================================
# Stage 2: Production
# ==============================================================================
FROM node:20-alpine

WORKDIR /app

# Build arguments for metadata
ARG BUILD_ID
ARG BUILD_TIMESTAMP
ARG GIT_COMMIT
ARG GIT_BRANCH
ARG VERSION=1.0.0

# Labels following OCI standards
LABEL org.opencontainers.image.title="Nexus Compliance Engine" \
      org.opencontainers.image.description="EU Regulatory Compliance Plugin for GDPR, AI Act, NIS2, ISO 27001" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.vendor="Adverant" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/adverant/nexus-compliance" \
      com.adverant.build.id="${BUILD_ID}" \
      com.adverant.build.timestamp="${BUILD_TIMESTAMP}" \
      com.adverant.build.branch="${GIT_BRANCH}"

# Environment variables
ENV NODE_ENV=production \
    NEXUS_BUILD_ID="${BUILD_ID}" \
    NEXUS_BUILD_TIMESTAMP="${BUILD_TIMESTAMP}" \
    NEXUS_GIT_COMMIT="${GIT_COMMIT}" \
    NEXUS_VERSION="${VERSION}" \
    NEXUS_PLUGIN_VERSION="${VERSION}" \
    PORT=9300 \
    HOST=0.0.0.0

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nexus -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy database migrations
COPY src/database/migrations ./database/migrations

# Create data directories
RUN mkdir -p /data/reports /data/frameworks && \
    chown -R nexus:nodejs /data

# Set ownership
RUN chown -R nexus:nodejs /app

# Switch to non-root user
USER nexus

# Expose port
EXPOSE 9300

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9300/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })" || exit 1

# Start application
CMD ["node", "dist/index.js"]
