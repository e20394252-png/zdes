# Развёртывание Event CRM в Docker на Windows

Пошаговая инструкция по запуску проекта в Docker-контейнерах на Windows.

## Требования

- **Windows 10/11** (64-bit) или **Windows Server**
- **Docker Desktop для Windows** ([скачать](https://www.docker.com/products/docker-desktop/))
- Установите Docker Desktop, включите WSL 2 при запросе и перезагрузите ПК при необходимости.
- Убедитесь, что Docker запущен: в PowerShell выполните `docker --version` и `docker-compose --version`.

## Шаг 1: Подготовка проекта

1. Откройте папку проекта в проводнике, например: `C:\Users\<Имя>\Videos\crm3`.

2. Создайте файл переменных окружения для production:
   - Скопируйте файл `.env.production.example` в `.env.production`.
   - В PowerShell из папки проекта:
     ```powershell
     Copy-Item .env.production.example .env.production
     ```
   - При необходимости отредактируйте `.env.production` (пароль БД, `SECRET_KEY` и т.д.). Для первого запуска можно оставить значения по умолчанию.

## Шаг 2: Сборка и запуск контейнеров

В **PowerShell** или **CMD** перейдите в каталог проекта и выполните:

```powershell
cd C:\Users\<Ваше_имя>\Videos\crm3

docker-compose --env-file .env.production build
```

Дождитесь окончания сборки образов (backend и frontend). При ошибке сети (таймаут) повторите команду.

Запуск всех сервисов:

```powershell
docker-compose --env-file .env.production up -d
```

Будут запущены:
- **db** — PostgreSQL (порт 5432 внутри сети);
- **redis** — Redis (порт 6379 внутри сети);
- **backend** — FastAPI (порт 8000);
- **frontend** — Nginx с фронтендом (порт 3000).

При первом запуске backend создаёт таблицы в БД и заполняет базу тестовыми и демо-данными (пользователи, воронка, залы, контакты, сделки, задачи).

## Шаг 3: Проверка работы

1. Откройте в браузере:
   - **Приложение:** http://localhost:3000  
   - **API (Swagger):** http://localhost:8000/docs  
   - **Проверка здоровья:** http://localhost:8000/health  

2. Войдите в систему с одним из тестовых аккаунтов (см. ниже).

## Тестовые учётные данные

После первого запуска в системе создаются пользователи и демо-данные.

| Роль        | Email                    | Пароль   |
|------------|---------------------------|----------|
| Администратор | admin@eventcrm.local   | admin    |
| Менеджер   | manager@eventcrm.local    | manager  |
| Сотрудник  | employee@eventcrm.local   | employee |

**Рекомендация:** после первого входа смените пароль администратора и при необходимости создайте своих пользователей в **Настройки → Менеджеры**.

## Демонстрационные данные

- **Воронка продаж** «Продажи» с этапами: Первое касание → КП → Ожидание оплаты → Успешные / Отказы.
- **Залы:** Большой зал, Малый зал, Конференц-зал (с ценами и расписанием).
- **Контакты:** 5 организаций (ООО «Праздник», ИП Козлов, Event Pro и др.).
- **Сделки:** 6 сделок в разных этапах воронки (свадьба, корпоратив, день рождения, мастер-класс, конференция, отказ).
- **Задачи:** несколько задач с напоминаниями и одна выполненная.

## Полезные команды

- **Остановить все контейнеры:**
  ```powershell
  docker-compose --env-file .env.production down
  ```

- **Остановить и удалить тома (БД и Redis будут очищены, при следующем `up` данные создадутся заново):**
  ```powershell
  docker-compose --env-file .env.production down -v
  ```

- **Пересобрать и запустить заново:**
  ```powershell
  docker-compose --env-file .env.production up -d --build
  ```

- **Просмотр логов backend:**
  ```powershell
  docker logs crm3-backend-1
  ```

- **Просмотр логов с обновлением в реальном времени:**
  ```powershell
  docker logs -f crm3-backend-1
  ```

## Возможные проблемы

### Ошибка при сборке (таймаут загрузки образов)

Повторите `docker-compose --env-file .env.production build`. При нестабильном интернете можно собирать по одному сервису:
`docker-compose build backend`, затем `docker-compose build frontend`.

### Backend не стартует (порт 8000 занят)

Измените порт в `docker-compose.yml`, например:
`ports: - "8001:8000"` у сервиса `backend`. Тогда API будет доступно по http://localhost:8001. Фронтенд по умолчанию обращается к `/api` через тот же хост (прокси Nginx), поэтому при доступе через http://localhost:3000 запросы уйдут на backend внутри сети Docker. Если открываете фронт по другому адресу, может потребоваться настройка прокси или переменных окружения фронтенда.

### После смены пароля БД или переменных в `.env.production`

Выполните пересборку и перезапуск с удалением томов (полная переустановка данных):
```powershell
docker-compose --env-file .env.production down -v
docker-compose --env-file .env.production up -d --build
```

### Очистка и повторный «первый запуск» с сидом

Чтобы снова получить тестовых пользователей и демо-данные:
```powershell
docker-compose --env-file .env.production down -v
docker-compose --env-file .env.production up -d
```

После этого снова используйте учётные данные из таблицы выше.
