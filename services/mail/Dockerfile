FROM python:3.13-slim-bookworm AS build
COPY --from=ghcr.io/astral-sh/uv:0.10.9 /uv /usr/local/bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY services/mail/pyproject.toml services/mail/uv.lock ./
RUN uv sync --locked --no-dev

FROM python:3.13-slim-bookworm
WORKDIR /app
RUN groupadd --gid 1001 app && useradd --uid 1001 --gid app --no-create-home app
COPY --from=build /app/.venv /app/.venv
COPY --chown=app:app services/mail/app.py services/mail/config.py services/mail/data.py services/mail/dates.py services/mail/provider.py services/mail/replay.py services/mail/server.py ./
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
USER app
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers", "--no-access-log"]
