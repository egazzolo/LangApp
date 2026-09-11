FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node index.mjs policy.mjs codec.check.mjs ./
RUN node codec.check.mjs
USER node
ENV DRY_RUN=true
CMD ["node", "index.mjs"]
