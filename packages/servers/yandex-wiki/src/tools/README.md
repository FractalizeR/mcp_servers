# MCP Tools — Yandex Wiki

**MCP Tools для Yandex Wiki сервера**

---

## Назначение

MCP Tools — инструменты для Claude для работы с Yandex Wiki API.

**Текущая структура:**
- **API Tools** — работа с Wiki (страницы, гриды)
- **Helper Tools** — утилиты (ping)
- **Shared** — общие утилиты (filter-fields)

**Слоистая архитектура:**
```
MCP Tool → YandexWikiFacade → API Operation → HttpClient → Yandex Wiki API
```

---

## Структура

```
src/tools/
├── api/                    # API tools
│   ├── grids/             # Работа с гридами
│   │   ├── get-grid/
│   │   └── get-grids/
│   └── pages/             # Работа со страницами
│       ├── get-page/
│       └── search-pages/
├── helpers/               # Вспомогательные tools
│   └── ping/
├── shared/                # Общие утилиты
│   └── filter-fields.ts   # ResponseFieldFilter
└── index.ts               # Экспорт
```

---

## Критические правила

### 1. Используй Facade, НЕ Operations напрямую

```typescript
// ПРАВИЛЬНО:
constructor(private wikiFacade: YandexWikiFacade) {}

execute() {
  const result = await this.wikiFacade.getPage(pageId);
}
```

### 2. Обязательные компоненты Tool

Каждый tool ДОЛЖЕН иметь:
1. **Static METADATA** — категоризация и сортировка в `tools/list`
2. **Zod Schema** — валидация параметров
3. **execute()** — логика выполнения

### 3. Параметр `fields` — только у одиночных GET, не у списочных

`fields` (`WikiFieldsSchema`, `src/common/schemas/fields.schema.ts`) — это
sparse-fieldset параметр самого Wiki API (`?fields=content,...`), не общий
клиентский механизм проекции. Он есть только у `yw_get_page`,
`yw_get_page_by_id`, `yw_get_grid` — одиночных GET сущности, где API по
умолчанию не отдаёт дорогие поля (`content`, `attributes`, `breadcrumbs`).

У списочных инструментов (`yw_get_comments`, `yw_get_comment_thread`,
`yw_get_descendants`, `yw_search`, `yw_get_resources`) параметра `fields`
нет **осознанно** — соответствующие эндпоинты Wiki API sparse-fieldset не
поддерживают, сервер всегда возвращает полный объект. Добавление `fields` в
схему таких tools создавало бы у агента ложное ожидание серверной фильтрации.

---

## Дополнительная документация

- **Core Framework:** [packages/framework/core/README.md](../../../../framework/core/README.md)
- **Yandex Wiki Server:** [packages/servers/yandex-wiki/README.md](../../README.md)
