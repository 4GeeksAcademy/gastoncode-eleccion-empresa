FROM node:22-alpine AS build

WORKDIR /app
COPY package.json ./
COPY uis/ uis/

RUN npm install --package-lock=false

ARG BACKOFFICE_URL
ENV NEXT_PUBLIC_DASHBOARD_URL=${BACKOFFICE_URL} \
    AUTH_API_URL=http://backend:8001 \
    SUPPLIERS_API_URL=http://backend:8000 \
    INCIDENTS_API_URL=http://backend:8002 \
    SUPPLIERS_UI_URL=http://127.0.0.1:3001 \
    INCIDENTS_MANAGER_UI_URL=http://127.0.0.1:3004 \
    NEXT_TELEMETRY_DISABLED=1

RUN test -n "$NEXT_PUBLIC_DASHBOARD_URL" \
    && npm run build -w brasaland-website \
    && npm run build -w dashboard-backoffice \
    && npm run build -w suppliers-backoffice \
    && npm run build -w incidents-manager

FROM node:22-alpine
RUN apk add --no-cache supervisor
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/ /app/
COPY deploy/frontend.supervisor.conf /etc/brasaland-supervisor.conf
COPY deploy/frontend-health.mjs /app/frontend-health.mjs

USER node
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ["node", "/app/frontend-health.mjs"]
CMD ["supervisord", "-n", "-c", "/etc/brasaland-supervisor.conf"]
