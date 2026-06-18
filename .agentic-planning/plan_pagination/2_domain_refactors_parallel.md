# Этап 2 — Доменные правки операций и инструментов (parallel)

> **СТАТУС: ✅ ГОТОВО** (все 10 эндпоинтов: changelog, comments, worklog,
> attachments, links, components, checklist, queues, projects, find_issues).
> Реализовано 5 параллельными агентами (изоляция по сервис-файлам; changelog
> ушёл в группу find_issues, т.к. делят `issue.service.ts`) + интегратор фасада.
> `validate:quiet`=0, knip=0, пакет ~2097 тестов. Расширенное ревью
> (Claude+Codex+DeepSeek) пройдено; исправлены: H1 (ложный hasNextPage в
> find_issues page-режиме + регрессионный тест), projects total (не подделываем
> длиной страницы), comments perPage→500 в fetchAll, truthy→!==undefined в
> projects/queues, searchCriteria.perPage не фабрикуется, describe FetchAll
> приведён к факту.
>
> **Отложено (см. этап 3 / решение пользователя):**
> - `maxTotalItems` (общий бюджет batch, HIGH в разделе 8) — схема готова
>   (`MaxTotalItemsSchema`), но НЕ подключена; describe больше его не обещает.
> - Орфанные `ProjectsListOutput`/`QueuesListOutput`/`ComponentsListOutput` —
>   удалить в cleanup (knip пока не флагует, реэкспорт через barrel).
> - Неединообразный формат batch-вывода (successful/failed как числа vs массивы;
>   changelog `failed[].key`) — pre-existing, не регрессия этапа 2.

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
