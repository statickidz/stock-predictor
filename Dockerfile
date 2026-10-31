FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    KRONOS_CACHE_DIR=/data/cache \
    KRONOS_HOST=0.0.0.0 \
    KRONOS_PORT=8000

WORKDIR /app
COPY requirements.txt requirements-torch.txt ./
RUN pip install --no-cache-dir -r requirements-torch.txt \
    && pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home --uid 10001 stock-predictor \
    && mkdir -p /data/cache && chown -R stock-predictor:stock-predictor /data
COPY --chown=stock-predictor:stock-predictor app ./app
COPY --chown=stock-predictor:stock-predictor vendor ./vendor
USER stock-predictor
VOLUME ["/data/cache"]
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD ["python", "-m", "app.healthcheck"]
CMD ["python", "-m", "app"]
