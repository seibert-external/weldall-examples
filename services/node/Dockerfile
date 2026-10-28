# One image for the Node resource servers; compose picks the service by argument.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/node/package.json ./services/node/package.json
COPY bootstrap/package.json ./bootstrap/package.json
RUN npm ci --ignore-scripts --workspace @demo/node-services
COPY services/node ./services/node
RUN npm run build --workspace services/node && npm prune --omit=dev --ignore-scripts --workspace @demo/node-services

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/services/node/package.json ./services/node/package.json
COPY --from=build --chown=node:node /app/services/node/dist/src ./services/node/dist/src
COPY --from=build --chown=node:node /app/services/node/view ./services/node/view
USER node
ENTRYPOINT ["node", "services/node/dist/src/server.js"]
