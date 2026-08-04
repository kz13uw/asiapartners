# Руководство по развертыванию (PostgreSQL + Docker + Nginx)

Это подробная пошаговая инструкция для запуск портала «Фирма Азия» на вашем боевом сервере (Ubuntu / Debian / CentOS / RHEL).

---

## 🛠️ 1. Подготовка сервера

Убедитесь, что на сервере установлены **Docker** и **Docker Compose**:

```bash
# Проверка наличия Docker
docker --version
docker compose version
```

Если Docker еще не установлен (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

---

## 📦 2. Настройка проекта и файла .env

1. Перейдите в каталог с проектом:
   ```bash
   cd /path/to/asiapartners
   ```

2. Создайте боевой файл конфигурации `.env` из шаблона:
   ```bash
   cp .env.example .env
   ```

3. (Опционально) Измените в файле `.env` пароли на более надежные:
   ```env
   POSTGRES_PASSWORD=Asia_Super_Password_2026!
   SECRET_KEY=Random_Long_Secret_Key_For_JWT_Tokens_2026
   ```

---

## 🚀 3. Запуск всех сервисов (БД + Бэкенд + Фронтенд + Nginx)

Запустите контейнеры в фоновом режиме через **docker-compose.prod.yml**:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Что произойдет автоматически при запуске:
1. **База данных PostgreSQL 16** поднимется в контейнере `asia_db_prod` на порту 5432.
2. **Кэш Redis 7** поднимется в контейнере `asia_redis_prod`.
3. **Бэкенд FastAPI** (`asia_backend_prod`) дождется готовности БД, автоматически создаст все таблицы и запустит скрипт наполнения первоначальными учётными записями.
4. **Фронтенд React + Nginx** (`asia_frontend_prod`) скомпилирует производство и запустит сайт на **80 порту**.

---

## 🔍 4. Проверка статуса и логов

Проверить, что все контейнеры запущены и работают (`Status: Up / healthy`):
```bash
docker-compose -f docker-compose.prod.yml ps
```

Просмотреть логи бэкенда и базы данных:
```bash
# Логи бэкенда
docker logs asia_backend_prod -f --tail 100

# Логи Nginx веб-сервера
docker logs asia_frontend_prod -f --tail 50
```

---

## 🔑 5. Учетные записи для первого входа

После запуска сайт доступен по IP-адресу или домену вашего сервера (порт 80):

* **Администратор**: `admin` / пароль `admin123`
* **Организатор**: `organizer` / пароль `org123`
* **Мониторинг**: `monitor` / пароль `monitor123`
* **Поставщик**: Вход и авто-регистрация по **ЭЦП (NCALayer)**

---

## 🔄 Перезапуск или обновление

Если вы внесли изменения в код и хотите обновить сервер:
```bash
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

Остановить проект:
```bash
docker-compose -f docker-compose.prod.yml down
```
