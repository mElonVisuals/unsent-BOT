# Use an official Node.js runtime as the base image
# Using a specific version (e.g., 20-alpine) is recommended for stability.
# 'alpine' variants are smaller, which means faster downloads and less disk space.
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if you have one)
# This step is optimized for caching. If only your code changes, npm install won't re-run.
COPY package*.json ./

# Install dependencies
# 'npm ci' is recommended for CI/CD environments as it uses package-lock.json to ensure exact versions.
RUN npm ci --only=production

# Copy the rest of your application code to the working directory
COPY . .

# Expose any ports your application might listen on.
# Discord bots typically connect outbound, so no port needs to be exposed for Discord itself.
# If you add a web dashboard later, you'd expose that port.
# EXPOSE 3000

# Define the command to run your application
# This is the command that will be executed when the container starts.
CMD ["node", "index.js"]

# Best practices for Dockerfiles:
# - Use specific versions for base images (node:20-alpine instead of node:latest)
# - Use npm ci instead of npm install for production builds
# - Keep layers small to improve build times and image size
# - Order COPY/RUN commands to leverage Docker's build cache