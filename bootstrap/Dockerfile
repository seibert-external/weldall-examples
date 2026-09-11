# weldall-source is the same immutable Git context as the server build.
FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/contracts/package.json ./services/contracts/package.json
COPY bootstrap/package.json ./bootstrap/package.json
RUN npm ci --ignore-scripts --workspace @demo/bootstrap
COPY --from=weldall-source packages/db/prisma/schema.prisma ./prisma/schema.prisma
RUN npx prisma generate --schema prisma/schema.prisma

FROM build AS integration
COPY bootstrap/*.mjs ./bootstrap/
COPY test/bootstrap.integration.mjs ./test/
CMD ["sh", "-ec", "npx prisma db push --schema prisma/schema.prisma --skip-generate && node test/bootstrap.integration.mjs"]

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Prisma CLI is an optional peer of @prisma/client; pruning retains it.
# Copy only the generated runtime and its dependency-free client package.
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY bootstrap/*.mjs ./bootstrap/
USER node
CMD ["node", "bootstrap/run.mjs"]
