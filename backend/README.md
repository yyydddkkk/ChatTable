# Backend

## Local dependencies

- PostgreSQL: `postgresql+psycopg://postgres:postgres@localhost:5432/chattable`
- Redis: `redis://localhost:6379/0`

Create the database once:

```bash
createdb chattable
```

## Environment

```bash
cd backend
cp .env.example .env
```

`app.core.config` always reads `backend/.env`, so you can start the app either from the repo root or from `backend/`.

## Run

```bash
cd backend
uv sync
UV_CACHE_DIR=/tmp/uv-cache uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Compatibility launcher:

```bash
cd backend
UV_CACHE_DIR=/tmp/uv-cache uv run python main.py
```

## Verify services

```bash
psql postgresql://postgres:postgres@localhost:5432/chattable -c 'select 1;'
redis-cli -u redis://localhost:6379/0 ping
```
