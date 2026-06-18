# Этап 2 — Доменные правки операций и инструментов (parallel)

**Зависимости:** этап 1 целиком (контракты `HttpResponseEnvelope`, `Paginator`, `PaginatedResult`, общие схемы) должен быть готов и провалидирован.

**Изоляция:** группы не пересекаются по файлам → можно раздать параллельным агентам в разных ветках.

## Общий паттерн правки (для каждого list-эндпоинта)
1. **Operation:** вместо `httpClient.get<Entry[]>(path)` → `getWithResponse<Entry[]>` + `Paginator`. Возврат `PaginatedResult<Entry>` (для batch — `BatchResult<string, PaginatedResult<Entry>>`). Прокинуть `perPage/page/fetchAll/maxItems`.
2. **Schema:** добавить `fetchAll`, `maxItems` (+ `perPage/page`, где их не было). Обновить `.describe()`.
3. **Tool:** фильтровать `data.items`, добавить `pagination` в выдачу (аддитивно). Для batch — `pagination` на каждую задачу рядом с массивом и `count`.
4. **Facade:** при необходимости расширить сигнатуры `getXMany`.
5. **Тесты:** мульти-страничный ответ (mock с `Link`), single-page, fetchAll с усечением (`truncated`), регрессия формата.

## Группы (file-isolated)

### 2.1 — changelog + comments
- `changelog`: сейчас БЕЗ `perPage/page` вовсе (`get-issue-changelog.operation.ts:82-84`). Добавить пагинацию полностью. Это исходный репортнутый баг.
- `comments`: уже есть `perPage/page` (`get-comments.schema.ts`), добавить `fetchAll`/метаданные.

### 2.2 — worklog + attachments + links
- Проверить, поддерживает ли каждый из них `Link` на реальном API; механизм Link-следования no-op если нет.
- `attachments`/`links` — batch по issueIds; `worklog` — batch.

### 2.3 — components + checklist
- `components` (v2, по очереди), `checklist` (v2, по задаче).

### 2.4 — queues + projects
- `projects`: ранее замечен баг `total = projects.length` — заменить на корректные метаданные из заголовков/Paginator.
- `queues`: добавить метаданные.

### 2.5 — find_issues (`_search`, POST, seek)
- DP-5 A: следовать `Link rel="next"` через `postWithResponse` с тем же телом.
- Сейчас операция сама клеит query-string и зовёт `post` (`find-issues.operation.ts:108-126`) — переключить на `postWithResponse` + `Paginator`.
- DP-6: решить форму выдачи (обернуть в `{items, pagination}` или добавить `pagination` соседним полем). Документировать ограничение по scroll (>10000).

## Edge cases (общие)
- batch: у части задач ошибка, у части — успех с разными `pagination` → формат `successful[].pagination` + `failed[]`.
- Endpoint без `Link` → одна страница, `hasNextPage=false`; контракт стабилен.
- Усечение по `maxItems` для длинных коллекций (changelog большой задачи).

## DoD (на каждую группу)
- Operation возвращает `PaginatedResult`, tool отдаёт `pagination`.
- Тесты на мульти-страницу/усечение/регрессию проходят.
- `npm run validate:quiet` по затронутому пакету зелёный.
