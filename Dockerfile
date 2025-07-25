# ---- Build Stage ----
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --progress=false

# Copy the rest of the application code
COPY . .

# Build the Next.js app with debugging optimizations
RUN npm run build

# ---- Production Stage ----
FROM --platform=$TARGETPLATFORM node:20-alpine AS runner

WORKDIR /app

# Copy only necessary files for production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./

# Set environment variables for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1np

# Use a non-root user for security
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

# Change ownership of the app directory to the appuser
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["npm", "start"] 