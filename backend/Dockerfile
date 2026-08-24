FROM python:3.11-slim

WORKDIR /app

# Системные зависимости + Java для KalkanCrypt (верификация ГОСТ ЭЦП НУЦ РК)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    openjdk-21-jre-headless \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Директория для загрузок
RUN mkdir -p /app/uploads

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
