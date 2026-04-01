# Stage 1: Build the application
FROM node:22-alpine AS builder

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN --mount=type=secret,id=github_token \
    npm config set @gnapi-tech:registry https://npm.pkg.github.com/ \
    && npm config set //npm.pkg.github.com/:_authToken "$(cat /run/secrets/github_token)" \
    && npm ci

# Copy the rest of the application source code
COPY . .

# Build the NestJS application
RUN npm run build

# Stage 2: Setup the production environment
FROM node:22-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN --mount=type=secret,id=github_token \
    npm config set @gnapi-tech:registry https://npm.pkg.github.com/ \
    && npm config set //npm.pkg.github.com/:_authToken "$(cat /run/secrets/github_token)" \
    && npm ci --omit=dev

# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist



# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]
