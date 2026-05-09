FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml .
COPY core/ core/
COPY shared/ shared/
COPY services/forge_me/ services/forge_me/
COPY services/analyze_me/ services/analyze_me/

RUN uv sync --frozen

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "core.main:app", "--host", "0.0.0.0", "--port", "8000"]