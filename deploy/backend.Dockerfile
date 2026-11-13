FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    UV_LINK_MODE=copy

RUN pip install --no-cache-dir uv==0.13.8 supervisor==4.3.0 \
    && useradd --create-home --uid 10001 app

WORKDIR /app
COPY services/api-auth/ services/api-auth/
COPY services/api-suppliers/ services/api-suppliers/
COPY services/api-incidents/ services/api-incidents/
COPY packages/incidents_analysis/ packages/incidents_analysis/

RUN uv sync --locked --no-dev --no-install-project --project services/api-auth \
    && uv sync --locked --no-dev --no-install-project --project services/api-suppliers \
    && uv sync --locked --no-dev --no-install-project --project services/api-incidents \
    && mkdir -p /data/auth /data/suppliers /data/incidents services/api-auth/data \
    && chown -R app:app /data services/api-auth/data

COPY deploy/backend.supervisor.conf /etc/brasaland-supervisor.conf
COPY deploy/backend-health.py /app/backend-health.py

USER app
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD ["python", "/app/backend-health.py"]
CMD ["supervisord", "-n", "-c", "/etc/brasaland-supervisor.conf"]
