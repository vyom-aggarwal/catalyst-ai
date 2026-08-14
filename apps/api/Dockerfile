# Python 3.12 per the agreed stack.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies are installed from pyproject.toml alone so this layer is cached
# across source edits.
COPY pyproject.toml ./
RUN pip install --upgrade pip \
    && pip install --no-cache-dir \
    "fastapi>=0.115.6" "uvicorn[standard]>=0.34.0" "pydantic>=2.10.4" \
    "sqlmodel>=0.0.22" "psycopg[binary]>=3.2.3" "alembic>=1.14.0" \
    "redis>=5.2.1" "rq>=2.1.0"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "catalyst.main:app", "--host", "0.0.0.0", "--port", "8000"]
