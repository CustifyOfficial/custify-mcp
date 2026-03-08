FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
ENV MCP_TRANSPORT=streamable-http
EXPOSE 3000
CMD ["node", "dist/index.js"]
