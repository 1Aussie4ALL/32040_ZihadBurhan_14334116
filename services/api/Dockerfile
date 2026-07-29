FROM python:3.12-slim

WORKDIR /app

COPY services/shared/requirements.txt /app/shared-requirements.txt
COPY services/api/requirements.txt /app/service-requirements.txt
RUN pip install --no-cache-dir -r /app/shared-requirements.txt -r /app/service-requirements.txt

COPY services/shared /app/shared
COPY services/api/app /app/app

ENV PYTHONPATH=/app/shared
ENV PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
