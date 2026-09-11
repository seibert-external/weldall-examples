FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/contracts/package.json ./services/contracts/package.json
COPY bootstrap/package.json ./bootstrap/package.json
RUN npm ci --ignore-scripts --workspace @demo/contracts
COPY services/contracts ./services/contracts
RUN npm run build --workspace services/contracts && npm prune --omit=dev --ignore-scripts --workspace @demo/contracts

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/services/contracts/package.json ./services/contracts/package.json
COPY --from=build --chown=node:node /app/services/contracts/dist/src ./services/contracts/dist/src
USER node
EXPOSE 3001
CMD ["node", "services/contracts/dist/src/server.js"]
