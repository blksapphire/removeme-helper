FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build && mkdir -p /data
ENV PORT=8787
ENV DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8787
CMD ["npm", "start"]
