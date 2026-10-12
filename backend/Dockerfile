FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# Single worker on purpose: the rate limiter is in-memory (see app/core/rate_limit.py).
# --proxy-headers makes request.client.host the real client IP (from
# X-Forwarded-For) when the connection comes from a proxy listed in
# FORWARDED_ALLOW_IPS; without it every user behind Render / FastAPI Cloud
# shares the proxy's IP and therefore one rate-limit bucket. The default
# trusts only localhost; see DEPLOY.md before setting it to "*".
ENV FORWARDED_ALLOW_IPS=127.0.0.1
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips \"${FORWARDED_ALLOW_IPS}\""]
