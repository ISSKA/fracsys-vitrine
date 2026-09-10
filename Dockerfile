# syntax=docker/dockerfile:1

# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Vite bakes these into the bundle at build time, so they are build args.
# DEPLOY_BASE defaults to "/" here: the container serves the app at the web
# root. Set it when deploying the complete app below a sub-path.
ARG DEPLOY_BASE=/
ARG VITE_DEFAULT_GRID_FILENAME=flow_network_voxels.csv
ENV DEPLOY_BASE=$DEPLOY_BASE \
    VITE_DEFAULT_GRID_FILENAME=$VITE_DEFAULT_GRID_FILENAME

# Dependencies first so edits to src/ do not invalidate the install layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- serve ----------------------------------------------------------------
FROM nginx:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1
