# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps to handle npm warnings
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./

# Install production dependencies with legacy peer deps
RUN apk add --no-cache python3 make g++ && \
    npm ci --only=production --legacy-peer-deps && \
    apk del python3 make g++

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Set NODE_ENV
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start:prod"] 