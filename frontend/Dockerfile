# Сборка: Этап 1 (Node.js)
FROM node:20-alpine as build-stage

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем исходный код и запускаем сборку React (Vite)
COPY . .
RUN npm run build

# Продакшен: Этап 2 (Nginx)
FROM nginx:alpine

# Удаляем стандартный конфиг Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Копируем наш правильный конфиг Nginx
COPY nginx.conf /etc/nginx/conf.d

# Копируем скомпилированные файлы из Этапа 1 (папка dist) в папку Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Nginx слушает порт 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
