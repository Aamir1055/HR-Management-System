# Multi-stage Docker build for PayRoll Management System Backend
# Optimized for production with security, performance, and minimal footprint

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ && \
    npm install -g pm2@latest

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Remove development dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine AS production

# Create app directory and user
RUN addgroup -g 1001 -S payroll && \
    adduser -S payroll -u 1001

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata && \
    npm install -g pm2@latest

# Set timezone (optional, adjust as needed)
ENV TZ=Asia/Dubai

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=payroll:payroll /app/node_modules ./node_modules
COPY --from=builder --chown=payroll:payroll /app/package*.json ./
COPY --from=builder --chown=payroll:payroll /app/*.js ./
COPY --from=builder --chown=payroll:payroll /app/middleware ./middleware
COPY --from=builder --chown=payroll:payroll /app/routes ./routes
COPY --from=builder --chown=payroll:payroll /app/ecosystem.config.js ./

# Create required directories
RUN mkdir -p logs uploads uploads/temp backups && \
    chown -R payroll:payroll /app

# Switch to non-root user
USER payroll

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
