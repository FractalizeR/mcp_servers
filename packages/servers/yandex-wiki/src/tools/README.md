# MCP Tools — Yandex Wiki

**MCP Tools для Yandex Wiki сервера**

---

## Назначение

MCP Tools — инструменты для Claude для работы с Yandex Wiki API.

**Текущая структура:**
- **API Tools** — работа с Wiki (страницы, гриды)
- **Helper Tools** — утилиты (ping, search_tools)
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
1. **Static METADATA** — для Tool Search Engine
2. **Zod Schema** — валидация параметров
3. **execute()** — логика выполнения

---

## Дополнительная документация

- **Core Framework:** [packages/framework/core/README.md](../../../../framework/core/README.md)
- **Yandex Wiki Server:** [packages/servers/yandex-wiki/README.md](../../README.md)
