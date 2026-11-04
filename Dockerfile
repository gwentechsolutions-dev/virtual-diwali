FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && mkdir -p /app/data && chown -R node:node /app/data
ENV PORT=2567 DATA_DIR=/app/data NODE_ENV=production
USER node
EXPOSE 2567
CMD ["npm", "start"]
