# Технологии backend разработки

## Описание проекта

В рамках контрольной работы №4 были выполнены практические задания №19-23,
охватывающие различные аспекты backend разработки, в том числе базы данных
(PostgreSQL, MongoDB, Redis), балансировку нагрузки (Nginx, HAProxy)
и контейнеризацию с Docker.

## Функциональные требования

### Практическое занятие 19 - PostgreSQL и Sequelize

- [x] Подключение к базе данных PostgreSQL
- [x] Настройка Sequelize ORM
- [x] CRUD-операции: создание, чтение, обновление и удаление записей
- [x] API на Express для взаимодействия c данными

Установка зависимостей и запуск:

```console
$ cd crud
$ npm install
$ node postgres.js
```

### Практическое занятие 20 - MongoDB и Mongoose

- [x] Подключение к базе данных MongoDB
- [x] Настройка Mongoose ODM
- [x] CRUD (create, read, update, delete) над коллекциями
- [x] API на Express для взаимодействия с данными

Установка зависимостей и запуск:

```console
$ cd crud
$ npm install
$ node mongo.js
```

### Практическое занятие 21 - Аутентификация и кэширование с Redis

- [x] Подключение к базе данных Redis
- [x] Хэширование паролей с помощью Argon2
- [x] Аутентификация с JWT (+ refresh токены) и ролевая модель доступа
- [x] Cache-first для `GET`, инвалидация при `POST`, `PUT` и `DELETE`

Установка зависимостей и запуск:

```console
$ cd redis
$ npm install
$ node server.js
```

### Практическое занятие 22 - Балансировка нагрузки с Nginx и HAProxy

- [x] Несколько серверов
- [x] Настройка Nginx через `nginx.conf`
- [x] Настройка HAProxy через `haproxy.cfg`
- [x] Подготовка к развертыванию через Docker

### Практическое занятие 23 - Контейнеризация с Docker

- [x] `Dockerfile` с описанием сервера
- [x] `compose-nginx.yaml` для балансировки с Nginx
- [x] `compose-haproxy.yaml` для балансировки с HAProxy
- [x] `docker compose` для развертывания

Переход в директорию:

```console
$ cd docker
```

Запуск с Nginx:

```console
$ docker compose --file compose-nginx.yaml up --build
```

Запуск с HAProxy:

```console
$ docker compose --file compose-haproxy.yaml up --build
```

## Технологии

- JS
- PostgreSQL
- MongoDB
- Redis
- Nginx
- HAProxy
- Docker
