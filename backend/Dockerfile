FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# Single worker on purpose: the rate limiter is in-memory (see app/core/rate_limit.py).
#
# --proxy-headers makes uvicorn take the client IP from X-Forwarded-For, but
# only for connections from an address in --forwarded-allow-ips. Without it,
# behind a reverse proxy every user shares the proxy's IP, so the per-IP rate
# limits (sign-in, signup, forgot-password) become one global bucket.
# FORWARDED_ALLOW_IPS is a comma-separated list of proxy IPs. "*" trusts every
# peer and is only safe when the host strips client-supplied X-Forwarded-For
# (Render does). Default: loopback only, i.e. headers are ignored.
ENV FORWARDED_ALLOW_IPS=127.0.0.1
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips \"${FORWARDED_ALLOW_IPS}\""]
