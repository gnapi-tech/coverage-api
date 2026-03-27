# Stage 1: Build the static React application using Vite
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copy package descriptors 
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the frontend source code
COPY . .

# Build the app bundle
RUN npm run build

# Stage 2: Serve the build using NGINX
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the built application from stage 1 into the NGINX folder
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Replace the default Nginx configuration with our custom proxy setup
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the frontend
EXPOSE 80

# Command to run NGINX in foreground
CMD ["nginx", "-g", "daemon off;"]
