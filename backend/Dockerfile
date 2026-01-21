FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy project files
COPY pyproject.toml ./
COPY src ./src

# Create virtual environment and install dependencies
RUN uv venv && \
    uv pip install -e .

# Expose port
EXPOSE 8000

# Activate venv and run server
CMD [".venv/bin/python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
