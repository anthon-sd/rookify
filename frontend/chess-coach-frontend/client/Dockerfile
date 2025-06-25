# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Accept build arguments
ARG VITE_API_URL
ARG VITE_REACT_APP_SUPABASE_URL
ARG VITE_REACT_APP_SUPABASE_ANON_KEY

# Set environment variables for the build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_REACT_APP_SUPABASE_URL=$VITE_REACT_APP_SUPABASE_URL
ENV VITE_REACT_APP_SUPABASE_ANON_KEY=$VITE_REACT_APP_SUPABASE_ANON_KEY

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 