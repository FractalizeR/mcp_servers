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

## 🏗️ Архитектура

### Compile-time индексирование

**Когда:** `npm run build` → автоматически

**Что индексируется:**
- Имя, категория, теги
- Pre-computed токены (имя + описание)
- Краткое описание

**Файл:** `generated-index.ts` (auto-generated, НЕ редактируй вручную)

### Runtime поиск

**Процесс:** Фильтрация → Стратегия поиска → Сортировка → Lazy load (если full) → LRU cache

**Главный класс:** `ToolSearchEngine` (tool-search-engine.ts)

---

## 🔍 Стратегии поиска (5 стратегий)

1. **NameSearchStrategy** — exact/partial match имени
2. **DescriptionSearchStrategy** — токены из описания, TF-IDF подобная оценка
3. **CategorySearchStrategy** — фильтрация по категории/тегам
4. **FuzzySearchStrategy** — Levenshtein distance (опечатки)
5. **WeightedCombinedStrategy** — комбинация всех (веса: Name 40%, Description 30%, Category 20%, Fuzzy 10%)

**Используется по умолчанию:** WeightedCombinedStrategy

**Файлы:** `strategies/*.ts`

---

## 🚀 Использование

**Файл:** `src/mcp/tools/helpers/search/search-tools.tool.ts`

**DetailLevel:**
- `name_only` — только имена
- `name_and_description` (по умолчанию) — имя + описание + категория + score
- `full` — полные метаданные + inputSchema + examples + matchDetails

---

## 🔧 Добавление нового tool

1. Добавь `static readonly METADATA` в Tool класс
2. Зарегистрируй в `tool-definitions.ts`
3. `npm run build` — автоматически обновит `generated-index.ts`

**ВСЁ!** Tool появится в поиске.

---

## ⚙️ Конфигурация

- **Константы:** `constants.ts` (limit: 10, detailLevel: 'name_and_description')
- **Веса стратегий:** `scoring/strategy-weights.ts` (Name 40%, Description 30%, Category 20%, Fuzzy 10%)
- **LRU Cache:** `MAX_CACHE_SIZE = 100`

**Тесты:** `tests/integration/mcp/search/tool-search-engine.test.ts`

---

## 🚨 Критические правила

1. ❌ **НЕ редактируй `generated-index.ts` вручную** — он auto-generated при build
2. ✅ **ВСЕГДА добавляй `METADATA`** в новые tools — иначе не появится в поиске
3. ✅ **Используй WeightedCombinedStrategy** — лучший результат для большинства запросов

---

## 🔗 См. также

- **MCP Tools:** [src/mcp/README.md](../README.md)
- **SearchToolsTool:** [src/mcp/tools/helpers/search/](../tools/helpers/search/)
- **Tool Metadata:** [src/mcp/tools/base/tool-metadata.ts](../tools/base/tool-metadata.ts)
- **ARCHITECTURE.md:** [ARCHITECTURE.md](../../../ARCHITECTURE.md)
