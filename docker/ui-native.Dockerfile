# The published UI image is linux/amd64 only, and its esbuild binary crashes under emulation on
# Apple Silicon. This reuses the same app source but installs dependencies for the host's own
# architecture. CI runs on x86 Linux and uses the published image directly.
ARG SPRINT=sprint5
FROM --platform=linux/amd64 testsmith/practice-software-testing-${SPRINT}-ui AS source
RUN rm -rf /app/node_modules

FROM node:22-slim
WORKDIR /app
COPY --from=source /app ./
RUN npm install --force --no-audit --no-fund
EXPOSE 4200
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200"]
