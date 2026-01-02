# Use Node 18 or 20
FROM node:18-alpine

# Working Dir
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 8080

# Start server
CMD ["npm", "start"]
