# Development stage
FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install ALL dependencies including devDependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application (needed for first run)
RUN npm run build

# Verify the migrations are in the dist folder
RUN ls -la dist/migrations || true && \
    echo "Ensuring migrations directory exists" && \
    mkdir -p dist/migrations && \
    echo "Copying migrations" && \
    cp -r src/migrations/* dist/migrations/ && \
    echo "Migration files:" && \
    ls -la dist/migrations/

# Expose port (this is for documentation, Railway will override with PORT env var)
EXPOSE 8080

# Set NODE_ENV (will be overridden by Railway environment variables)
ENV NODE_ENV=development

# Start the application in development mode
CMD ["sh", "-c", "npm run start:dev"] 