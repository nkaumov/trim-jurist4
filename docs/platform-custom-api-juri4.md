# Подключение платформы к `juri4` через Tool **Custom HTTP API**

Этот документ описывает, как на платформе настроить Tool **Custom HTTP API** так, чтобы внешний обработчик мог:

- получить контекст дела из `juri4`;
- отправить обратно результат анализа (структурированный JSON).

## 1) Публичный URL сервиса `juri4`

Сейчас публичный доступ обеспечен через **Tailscale Funnel** и проксирует внешний HTTPS на локальный `frontend` (порт `3080`):

- Public base: `https://abc.tail47eed8.ts.net`
- API proxy (Next → backend): `https://abc.tail47eed8.ts.net/api/*`
- Integration base (рекомендуется для Custom API): `https://abc.tail47eed8.ts.net/api/integration`

Проверка:

```bash
curl.exe https://abc.tail47eed8.ts.net/api/integration/health
```

### Если после перезагрузки видите `502 Bad Gateway`

Это означает, что Funnel/Serve проксирует на `http://127.0.0.1:3080`, но на этом порту ничего не слушает (контейнеры/процесс не запущены).

Мини-чеклист:

```bash
tailscale serve status
tailscale funnel status
curl.exe -i http://127.0.0.1:3080/api/integration/health
curl.exe -i https://abc.tail47eed8.ts.net/api/integration/health
```

Если используете Docker Compose — убедитесь, что **Docker Desktop запущен** (и лучше включить автозапуск). В `docker-compose.yml` выставлен `restart: unless-stopped`, чтобы сервисы поднимались автоматически после старта Docker.

### Если с одной сети “ошибка соединения”, а с другой работает

Иногда виноват IPv6 (или политика сети). Быстрые проверки/обходы:

```bash
# форсировать IPv4
curl.exe -4 -i https://abc.tail47eed8.ts.net/api/integration/health

# форсировать IPv6
curl.exe -6 -i https://abc.tail47eed8.ts.net/api/integration/health
```

Если по IPv4 работает, а по умолчанию нет — проблема в IPv6 на клиентской стороне/в сети.

### Если `curl.exe` OK, а в браузере “не открывается”

Это почти всегда клиентская проблема (прокси/расширение/антивирус/DNS в браузере).

Чеклист:

- Откройте в браузере именно `https://abc.tail47eed8.ts.net/api/integration/health` (если он не открывается — проблема не в приложении).
- Попробуйте режим инкогнито и/или другой браузер.
- Временно отключите VPN/Proxy и расширения (AdGuard/антибаннеры/корпоративные прокси).
- Проверьте, что вы открываете URL с того же устройства/сети, где ожидаете доступ (если проверяете с телефона/другого ПК — это уже другой клиент).

Особый кейс для Tailscale: если в браузере включён **Secure DNS / DNS-over-HTTPS (DoH)**, браузер может игнорировать системный DNS (MagicDNS) и резолвить `*.ts.net` через публичные DNS-серверы.

- Тогда `curl.exe` (использует системный DNS) будет идти на tailnet-IP и “всё OK”.
- А браузер будет пытаться идти “в интернет” на Funnel-адреса и может получать таймаут/ошибку соединения.

Решение для работы “внутри tailnet”: отключить Secure DNS/DoH в браузере (или поставить “использовать провайдера системы”).

Проверка **именно публичной** доступности (в обход MagicDNS) — удобно из Docker (там обычный DNS):

```bash
docker run --rm curlimages/curl:8.11.0 -i https://abc.tail47eed8.ts.net/api/integration/health
```

## 1.1) Запуск сервисов (Docker Compose)

`docker-compose.yml` настроен так, чтобы базовые образы тянулись из `public.ecr.aws` (зеркало), чтобы обойти таймауты/проблемы с Docker Hub.

Запуск:

```bash
cd C:\1trim\urist\juri4
docker compose up --build -d
```

## 2) Какие endpoints есть в `juri4` для внешней системы

Все endpoints ниже работают через `frontend`-прокси `/api/*` и уходят на backend.

### Health (без ключа)

- `GET /api/integration/health`
- Ответ: `{ "ok": true }`

### Очередь дел на анализ (нужен ключ)

- `GET /api/integration/queue?limit=20`
- Headers: `X-Juri4-Integration-Key: <INTEGRATION_API_KEY>`
- Ответ: список дел со статусом `ready_for_analysis` (минимальные поля + `updatedAt`)

### Получить контекст дела (нужен ключ)

- `GET /api/integration/cases/{id}/context`
- Headers (один из):
  - `X-Juri4-Integration-Key: <INTEGRATION_API_KEY>`
  - `X-Integration-Key: <INTEGRATION_API_KEY>`
- Важное: в `organizationKnowledge[]` поле **`rules`** — это правила/инструкции к шаблону/документу (то, что юрист заполняет в БЗ вместо “описания”).

### Отправить результат анализа (нужен ключ)

- `POST /api/integration/cases/{id}/analysis-result`
- Headers: как выше
- Body (JSON) соответствует `AiAnalysisResponse`:

```json
{
  "caseSummary": "string",
  "finalRecommendation": "string",
  "draftProtocolText": "string",
  "positions": [
    {
      "clauseNumber": "string | null",
      "clauseTitle": "string",
      "ourVersion": "string | null",
      "counterpartyVersion": "string | null",
      "aiComment": "string",
      "recommendation": "string",
      "suggestedProtocolText": "string | null",
      "riskLevel": "low | medium | high",
      "bases": [
        {
          "basisType": "law | regulation | template | guideline | other",
          "sourceTitle": "string",
          "sourceReference": "string | null",
          "quoteText": "string | null"
        }
      ]
    }
  ]
}
```

Успешный ответ: `201 { "ok": true, "data": { "analysisRunId": "..." } }`.

## 3) Что умеет Tool Custom HTTP API на платформе (важные ограничения)

По реализации `tools/http_api` в `platform_dev`:

- Тело запроса поддерживается только как JSON (`body`) и отправляется только для `POST/PUT/PATCH`.
- `path_params` подставляются в path вида `/cases/{id}/context`.
- Есть защита от SSRF: итоговый URL обязан начинаться с `base_url`.
- Таймаут запроса по умолчанию `30s`.
- Максимальный размер ответа ~`100_000` символов, дальше будет `... [TRUNCATED]`.

Вывод: для больших контрактов/текстов лучше планировать либо сокращение ответа, либо отдельные endpoints под “чанки”.

## 4) Настройка Custom API на платформе (UI)

Ниже — логика настройки (названия экранов могут отличаться, но поля те же).

1. Создайте интеграцию/обработчик на платформе.
2. Включите инструмент `http_api` / “Custom HTTP API”.
3. Добавьте Custom API:
   - **Name**: `Juri4`
   - **Slug**: `juri4` (или любой, но запомните)
   - **Base URL**: `https://abc.tail47eed8.ts.net/api/integration`
   - **Auth**:
     - Type: `api_key_header`
     - Header name: `X-Juri4-Integration-Key`
     - Header value: значение `INTEGRATION_API_KEY` из backend (`apps/backend`)
4. Добавьте методы (methods) в эту API:
   - `health`
     - HTTP: `GET`
     - Path: `/health`
   - `queue`
     - HTTP: `GET`
     - Path: `/queue`
   - `get_case_context`
     - HTTP: `GET`
     - Path: `/cases/{id}/context`
   - `submit_analysis_result`
     - HTTP: `POST`
     - Path: `/cases/{id}/analysis-result`
     - Body schema: как `AiAnalysisResponse` выше (не обязательно для исполнения, но полезно для генерации/валидации)

## 5) Как вызывать методы (пример)

1) Посмотреть, что доступно:

```json
{
  "tool": "http_api.list_available_apis",
  "args": {}
}
```

2) Получить контекст дела:

```json
{
  "tool": "http_api.call_http_api",
  "args": {
    "api_slug": "juri4",
    "method_name": "get_case_context",
    "path_params": { "id": "CASE_ID" }
  }
}
```

3) Отправить результат анализа:

```json
{
  "tool": "http_api.call_http_api",
  "args": {
    "api_slug": "juri4",
    "method_name": "submit_analysis_result",
    "path_params": { "id": "CASE_ID" },
    "body": {
      "caseSummary": "...",
      "finalRecommendation": "...",
      "draftProtocolText": "...",
      "positions": []
    }
  }
}
```

## 6) Настройка ключа доступа (`INTEGRATION_API_KEY`)

Ключ задаётся в backend через переменную окружения `INTEGRATION_API_KEY` (см. `apps/backend/.env`, файл игнорируется `.gitignore`).

На платформе в Custom API укажите этот же ключ в `X-Juri4-Integration-Key`.

Быстро посмотреть текущее значение:

```bash
cd C:\1trim\urist\juri4
findstr INTEGRATION_API_KEY apps\backend\.env
```

Рекомендуется: длинная случайная строка, ротация при утечке, не хранить в открытом виде в промптах.
