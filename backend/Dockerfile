# Step 1: Base image
FROM node:20-alpine

# Step 2: Set working directory
WORKDIR /app

# Step 3: Copy package.json + package-lock.json (or pnpm/yarn)
COPY package*.json ./

# Step 4: Install dependencies
RUN npm install

# Step 5: Copy rest of the code
COPY . .

# Step 6: Expose port (matches your .env PORT)
EXPOSE 3000

# Step 7: Start server with hot reload (dev)
CMD ["npx", "tsx", "watch", "src/server.ts"]