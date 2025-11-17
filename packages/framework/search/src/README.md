# Tool Search System

**Compile-time индексирование + runtime поиск MCP tools**

---

## 🎯 Назначение

**Проблема:** Claude должен быстро находить нужные MCP tools без загрузки всего кода.

**Решение:**
1. **Compile-time индексирование** — генерация статического индекса при build
2. **Runtime поиск** — 5 стратегий с LRU кешем

**Результат:** Поиск без импорта tool классов (экономия памяти + скорость)

---

## 📁 Структура

```
src/mcp/search/
├── tool-search-engine.ts          # Главный класс движка
├── types.ts                        # Типы (StaticToolIndex, SearchResult)
├── constants.ts                    # Константы (лимиты, detail level)
├── generated-index.ts              # Auto-generated статический индекс
├── strategies/                     # 5 стратегий поиска
│   ├── search-strategy.interface.ts
│   ├── name-search.strategy.ts
│   ├── description-search.strategy.ts
│   ├── category-search.strategy.ts
│   ├── fuzzy-search.strategy.ts
│   └── weighted-combined.strategy.ts
└── scoring/
    └── strategy-weights.ts         # Веса для комбинированной стратегии
```

---

## 🏗️ Архитектура

### Compile-time индексирование

**Когда:** При каждом `npm run build` (автоматически)

**Как:** `scripts/generate-tool-index.ts` → `src/mcp/search/generated-index.ts`

**Что индексируется:**
- Имя tool
- Категория (API/Helper)
- Теги для поиска
- Pre-computed токены из имени и описания
- Краткое описание (без `inputSchema`)

**Почему pre-computed токены:**
- Токенизация происходит 1 раз при build
- Runtime поиск работает с готовыми токенами
- Экономия CPU при каждом поиске

**Пример `generated-index.ts`:**
```typescript
// Auto-generated, НЕ редактируй вручную
export const STATIC_TOOL_INDEX: StaticToolIndex[] = [
  {
    name: 'fyt_mcp_get_issues',
    category: 'api',
    tags: ['issues', 'batch', 'tracker'],
    isHelper: false,
    nameTokens: ['get', 'issues'],
    descriptionTokens: ['получить', 'задачи', 'ключам'],
    descriptionShort: 'Получить задачи по ключам',
  },
  // ...
];
```

### Runtime поиск

**Процесс:**
1. Фильтрация статического индекса (по категории/типу)
2. Применение стратегии поиска
3. Сортировка по релевантности (score)
4. Lazy loading полных метаданных (если `detailLevel: 'full'`)
5. Кеширование результата (LRU cache, max 100 entries)

**Главный класс:** `ToolSearchEngine` (src/mcp/search/tool-search-engine.ts)

---

## 🔍 Стратегии поиска

### 1. NameSearchStrategy

**Поиск по имени tool**

- Exact match: `fyt_mcp_ping` → score: 1.0
- Частичное совпадение: `ping` → score: 0.8
- Учитывает токены: `get issues` → найдет `fyt_mcp_get_issues`

**Файл:** `strategies/name-search.strategy.ts`

### 2. DescriptionSearchStrategy

**Поиск по описанию**

- Tokenization: разбивает запрос на токены
- TF-IDF подобная оценка
- Case-insensitive

**Файл:** `strategies/description-search.strategy.ts`

### 3. CategorySearchStrategy

**Фильтрация по категории и тегам**

- Категории: `api`, `helper`, `meta`, `data`
- Теги: массив строк из `static readonly METADATA`
- Score: 1.0 при совпадении категории/тега, 0 иначе

**Файл:** `strategies/category-search.strategy.ts`

### 4. FuzzySearchStrategy

**Нечеткий поиск (опечатки)**

- Levenshtein distance
- Порог: расстояние ≤ 2
- Score зависит от расстояния

**Файл:** `strategies/fuzzy-search.strategy.ts`

### 5. WeightedCombinedStrategy

**Комбинация всех стратегий**

Веса (настраиваются в `scoring/strategy-weights.ts`):
- Name: 40%
- Description: 30%
- Category/Tags: 20%
- Fuzzy: 10%

**Использование:** По умолчанию во всех поисках

**Файл:** `strategies/weighted-combined.strategy.ts`

---

## 🚀 Использование

### В SearchToolsTool

**Файл:** `src/mcp/tools/helpers/search/search-tools.tool.ts`

```typescript
const result = toolSearchEngine.search({
  query: 'получить задачи',
  limit: 10,
  detailLevel: 'name_and_description',
  category: 'api', // опционально
});

// result: { tools: [...], totalFound: 5 }
```

### DetailLevel варианты

**`name_only`** — только имена (минимальные токены)
```json
{ "name": "fyt_mcp_get_issues" }
```

**`name_and_description`** (по умолчанию) — имя + описание + категория
```json
{
  "name": "fyt_mcp_get_issues",
  "description": "Получить задачи по ключам",
  "category": "api",
  "score": 0.87
}
```

**`full`** — полные метаданные (lazy load из ToolRegistry)
```json
{
  "name": "fyt_mcp_get_issues",
  "description": "Получить задачи по ключам",
  "category": "api",
  "tags": ["issues", "batch"],
  "inputSchema": { ... },
  "examples": ["QUEUE-1", "QUEUE-2"],
  "score": 0.87,
  "matchDetails": {
    "name": 0.8,
    "description": 0.9,
    "category": 1.0
  }
}
```

---

## 🔧 Добавление нового tool

**1. Добавь `static readonly METADATA` в Tool класс:**

```typescript
export class MyNewTool extends BaseTool {
  static readonly METADATA: StaticToolMetadata = {
    name: 'fyt_mcp_my_new_tool',
    category: 'api',
    tags: ['custom', 'feature'],
  };
  // ...
}
```

**2. Зарегистрируй в `tool-definitions.ts`:**

```typescript
export const TOOL_CLASSES = [
  // ... existing tools
  MyNewTool, // ← добавь одну строку
] as const;
```

**3. Запусти build:**

```bash
npm run build  # Автоматически обновит generated-index.ts
```

**ВСЁ!** Tool появится в поиске автоматически.

---

## ⚙️ Конфигурация

**Константы:** `src/mcp/search/constants.ts`

```typescript
DEFAULT_TOOL_SEARCH_LIMIT = 10;          // Лимит результатов
DEFAULT_TOOL_SEARCH_DETAIL_LEVEL = 'name_and_description';
```

**Веса стратегий:** `src/mcp/search/scoring/strategy-weights.ts`

```typescript
STRATEGY_WEIGHTS = {
  name: 0.4,         // 40% — точное совпадение имени
  description: 0.3,  // 30% — совпадение описания
  category: 0.2,     // 20% — категория/теги
  fuzzy: 0.1,        // 10% — нечеткий поиск
};
```

**LRU Cache:** `ToolSearchEngine.MAX_CACHE_SIZE = 100`

---

## 🧪 Тестирование

**Файл:** `tests/integration/mcp/search/tool-search-engine.test.ts`

**Покрытие:**
- ✅ Поиск по имени (exact + partial)
- ✅ Поиск по описанию (токены)
- ✅ Поиск по категории/тегам
- ✅ Нечеткий поиск (опечатки)
- ✅ Комбинированная стратегия
- ✅ Фильтрация по категории/типу
- ✅ Detail level варианты
- ✅ LRU кеширование

---

## 🚨 Критические правила

### 1. НЕ редактируй generated-index.ts вручную

❌ **Неправильно:**
```typescript
// generated-index.ts
export const STATIC_TOOL_INDEX = [
  { name: 'my_tool', ... }, // ← добавил вручную
];
```

✅ **Правильно:**
- Добавь `METADATA` в Tool класс
- Зарегистрируй в `tool-definitions.ts`
- Запусти `npm run build`

### 2. ВСЕГДА добавляй METADATA в новые tools

```typescript
// ❌ Забыли METADATA
export class MyTool extends BaseTool {
  // Без METADATA → tool НЕ появится в поиске
}

// ✅ С METADATA
export class MyTool extends BaseTool {
  static readonly METADATA: StaticToolMetadata = {
    name: 'fyt_mcp_my_tool',
    category: 'api',
    tags: ['feature'],
  };
}
```

### 3. Используй WeightedCombinedStrategy по умолчанию

```typescript
// ✅ Лучший результат для большинства запросов
const strategy = new WeightedCombinedStrategy([
  nameStrategy,
  descriptionStrategy,
  categoryStrategy,
  fuzzyStrategy,
]);
```

---

## 🔗 См. также

- **MCP Tools:** [src/mcp/README.md](../README.md)
- **SearchToolsTool:** [src/mcp/tools/helpers/search/](../tools/helpers/search/)
- **Tool Metadata:** [src/mcp/tools/base/tool-metadata.ts](../tools/base/tool-metadata.ts)
- **ARCHITECTURE.md:** [ARCHITECTURE.md](../../../ARCHITECTURE.md)
