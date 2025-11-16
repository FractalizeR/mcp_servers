# Continuation Prompt: Этап 3 - Полировка и стабилизация

## Контекст

Этот файл содержит инструкции для **Этапа 3** (финального) улучшения покрытия тестами проекта MCP Server Yandex Tracker.

### Текущая ситуация
**Дата анализа:** 2025-11-16
**Ветка:** `claude/improve-test-coverage-018qgWyfygUQQts4aw8wTnkM`

**Покрытие после Этапа 2:**
- Lines: ~73% → **Цель этапа: 76%+**
- Functions: ~80% → **Цель этапа: 85%+**
- Statements: ~73% → **Цель этапа: 76%+**
- Branches: ~70% → **Цель этапа: 75%+**

**Провальные тесты:** 17 интеграционных тестов (КРИТИЧНО!)

### Предыдущие этапы
✅ **Этап 1 завершён** - API Operations, Facade, HTTP Client
✅ **Этап 2 завершён** - MCP Tools, Composition Root

---

## Цели Этапа 3

**Время:** 1 день
**Ожидаемое улучшение:** +3% покрытия + исправление провальных тестов
**Результат:** ~76% общее покрытие + 100% проходимость тестов

**Приоритеты:**
1. **КРИТИЧНО:** Исправить 17 провальных интеграционных тестов
2. Довести покрытие до 76%+
3. Стабилизировать CI/CD pipeline

---

## Задачи

### Задача 3.1: КРИТИЧНО - Исправить провальные интеграционные тесты

**Проблема:** 17 интеграционных тестов падают с timeout (5000ms)

**Провальные файлы:**
1. `tests/integration/mcp/tools/api/issues/get/get-issues.tool.integration.test.ts` - 8 failed
2. `tests/integration/mcp/tools/api/issues/find/find-issues.tool.integration.test.ts` - 9 failed

**Причина:** Timeout 5000ms - вероятно отсутствие или неправильная настройка подключения к реальному API Яндекс.Трекера.

---

#### 3.1.1. Диагностика проблемы

**Шаг 1:** Проверить наличие переменных окружения

```bash
# Проверить файл .env
cat .env | grep TRACKER_API

# Должны быть:
# TRACKER_API_BASE_URL=https://api.tracker.yandex.net
# TRACKER_API_TOKEN=<токен>
# TRACKER_API_ORG_ID=<org_id>
```

**Шаг 2:** Запустить один провальный тест для диагностики

```bash
# Запустить с подробным выводом
npx vitest run tests/integration/mcp/tools/api/issues/get/get-issues.tool.integration.test.ts --reporter=verbose
```

**Шаг 3:** Анализ ошибки

Возможные причины:
- Отсутствует `TRACKER_API_TOKEN` в `.env`
- Неверный токен
- Нет доступа к интернету из тестового окружения
- Неправильный базовый URL

---

#### 3.1.2. Решение А: Skip тесты если нет API токена (РЕКОМЕНДУЕТСЯ)

Интеграционные тесты должны пропускаться (skip), если нет доступа к реальному API.

**Что делать:**

1. Обновить `tests/integration/mcp/tools/api/issues/get/get-issues.tool.integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Проверка наличия токена API
const TRACKER_API_TOKEN = process.env.TRACKER_API_TOKEN;
const hasApiAccess = !!TRACKER_API_TOKEN;

// Условный describe - skip если нет токена
const describeOrSkip = hasApiAccess ? describe : describe.skip;

describeOrSkip('get-issues integration tests', () => {
  // Существующие тесты...

  // Добавить в beforeAll проверку
  beforeAll(() => {
    if (!hasApiAccess) {
      console.warn('⚠️  Skipping integration tests: TRACKER_API_TOKEN not set');
    }
  });

  // Остальные тесты остаются без изменений
});
```

2. Обновить `tests/integration/mcp/tools/api/issues/find/find-issues.tool.integration.test.ts` аналогично

3. Создать `tests/integration/setup.ts` для общей логики:

```typescript
// tests/integration/setup.ts
export const hasTrackerApiAccess = (): boolean => {
  return !!(
    process.env.TRACKER_API_TOKEN &&
    process.env.TRACKER_API_BASE_URL &&
    process.env.TRACKER_API_ORG_ID
  );
};

export const skipIfNoApiAccess = (testName: string) => {
  if (!hasTrackerApiAccess()) {
    console.warn(`⚠️  Skipping ${testName}: API credentials not configured`);
  }
  return hasTrackerApiAccess();
};
```

4. Обновить оба теста с использованием helper:

```typescript
import { skipIfNoApiAccess } from '@integration/setup.js';

const describeOrSkip = skipIfNoApiAccess('get-issues integration')
  ? describe
  : describe.skip;
```

**Результат:** Тесты будут пропускаться (skip) вместо падения, если нет API токена.

---

#### 3.1.3. Решение Б: Mock API через nock/msw (ОПЦИОНАЛЬНО)

Если требуется запуск интеграционных тестов без реального API:

**Установить nock:**

```bash
npm install --save-dev nock
```

**Создать mock для API:**

```typescript
// tests/integration/mocks/tracker-api.mock.ts
import nock from 'nock';

export const mockTrackerApi = () => {
  const baseUrl = process.env.TRACKER_API_BASE_URL || 'https://api.tracker.yandex.net';

  // Mock для GET /v3/issues/{issueKey}
  nock(baseUrl)
    .get(/\/v3\/issues\/[A-Z]+-\d+/)
    .reply(200, {
      id: '1',
      key: 'TEST-1',
      summary: 'Test Issue',
      status: { key: 'open' },
    });

  // Mock для POST /v3/issues/_search
  nock(baseUrl)
    .post('/v3/issues/_search')
    .reply(200, [
      {
        id: '1',
        key: 'TEST-1',
        summary: 'Test Issue',
      },
    ]);

  // Добавить другие endpoints по необходимости
};

export const cleanupMocks = () => {
  nock.cleanAll();
};
```

**Использовать в тестах:**

```typescript
import { mockTrackerApi, cleanupMocks } from '@integration/mocks/tracker-api.mock.js';

describe('get-issues integration tests', () => {
  beforeAll(() => {
    if (!hasTrackerApiAccess()) {
      mockTrackerApi(); // Использовать mock если нет API
    }
  });

  afterAll(() => {
    cleanupMocks();
  });

  // Тесты...
});
```

---

#### 3.1.4. Увеличение timeout для интеграционных тестов

Если проблема в медленном API:

**Обновить vitest.config.ts:**

```typescript
export default defineConfig({
  test: {
    // ...существующая конфигурация

    // Увеличить timeout для интеграционных тестов
    testTimeout: 10000, // 10 секунд вместо 5

    // Или настроить по паттерну файлов
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts'
    ],
  },
});
```

**Или в самих тестах:**

```typescript
describe('get-issues integration tests', () => {
  // Установить timeout для всех тестов в suite
  it('should get issue by key', async () => {
    // ...
  }, 10000); // 10 секунд timeout
});
```

---

### Задача 3.2: Search Strategies tests (+3% покрытия)

**Проблема:** Только name-search.strategy покрыт на 100%, остальные стратегии не покрыты

**Что делать:**

Создать unit тесты для всех стратегий поиска (по образцу `tests/unit/mcp/search/strategies/name-search.strategy.test.ts`).

---

#### ✅ 3.2.1. ВЫПОЛНЕНО - CategorySearchStrategy tests

**Файл:** `tests/unit/mcp/search/strategies/category-search.strategy.test.ts`
**Тестируемый:** `src/mcp/search/strategies/category-search.strategy.ts`
**Статус:** 19 тестов проходят

**Тесты:**
1. ✅ should find exact category match
2. ✅ should find partial category match
3. ✅ should be case insensitive
4. ✅ should return 0 score for non-matching category
5. ✅ should handle missing category in metadata
6. ✅ should prioritize exact matches over partial
7. ✅ should search in multiple categories if present

**Пример:**

```typescript
import { describe, it, expect } from 'vitest';
import { CategorySearchStrategy } from './category-search.strategy.js';

describe('CategorySearchStrategy', () => {
  const strategy = new CategorySearchStrategy();

  it('should find exact category match', () => {
    const metadata = {
      name: 'get-issues',
      description: 'Get issues',
      category: 'issues',
      tags: [],
    };

    const score = strategy.search('issues', metadata);
    expect(score).toBeGreaterThan(0);
  });

  it('should be case insensitive', () => {
    const metadata = {
      name: 'get-issues',
      description: 'Get issues',
      category: 'Issues',
      tags: [],
    };

    const score = strategy.search('issues', metadata);
    expect(score).toBeGreaterThan(0);
  });

  it('should return 0 for non-matching category', () => {
    const metadata = {
      name: 'get-issues',
      description: 'Get issues',
      category: 'users',
      tags: [],
    };

    const score = strategy.search('issues', metadata);
    expect(score).toBe(0);
  });
});
```

---

#### ✅ 3.2.2. ВЫПОЛНЕНО - DescriptionSearchStrategy tests

**Файл:** `tests/unit/mcp/search/strategies/description-search.strategy.test.ts`
**Тестируемый:** `src/mcp/search/strategies/description-search.strategy.ts`
**Статус:** 17 тестов проходят

**Тесты:**
1. ✅ should find query in description
2. ✅ should be case insensitive
3. ✅ should return 0 for non-matching description
4. ✅ should handle missing description
5. ✅ should score higher for multiple occurrences
6. ✅ should find partial word matches

---

#### 3.2.3. ExactMatchStrategy tests

**Файл:** `tests/unit/mcp/search/strategies/exact-match.strategy.test.ts`
**Тестируемый:** `src/mcp/search/strategies/exact-match.strategy.ts`

**Тесты:**
1. ✅ should return high score for exact name match
2. ✅ should be case insensitive
3. ✅ should return 0 for non-exact match
4. ✅ should handle partial matches (score lower than exact)
5. ✅ should ignore whitespace differences

---

#### ✅ 3.2.4. ВЫПОЛНЕНО - FuzzySearchStrategy tests

**Файл:** `tests/unit/mcp/search/strategies/fuzzy-search.strategy.test.ts`
**Тестируемый:** `src/mcp/search/strategies/fuzzy-search.strategy.ts`
**Статус:** 28 тестов проходят

**Тесты:**
1. ✅ should find similar strings (typos)
2. ✅ should score by similarity distance
3. ✅ should handle character transpositions
4. ✅ should handle missing characters
5. ✅ should handle extra characters
6. ✅ should return 0 for very dissimilar strings

---

### Задача 3.3: Улучшение существующих тестов

**Цель:** Повысить покрытие веток (branches) в уже протестированных модулях

#### 3.3.1. GetIssuesOperation - покрыть строки 76-81

**Файл:** `tests/unit/tracker_api/api_operations/issue/get/get-issues.operation.test.ts`

Проанализировать файл `src/tracker_api/api_operations/issue/get/get-issues.operation.ts:76-81` и добавить тесты для непокрытых веток.

#### 3.3.2. ResponseFieldFilter - покрыть строки 58, 84, 92

**Файл:** `tests/unit/mcp/utils/response-field-filter.test.ts`

Добавить тесты для edge cases:
- Пустой массив полей
- Вложенные null значения
- Массивы объектов с фильтрацией

---

### Задача 3.4: Документация и автоматизация

#### 3.4.1. Обновить tests/README.md

Добавить секцию про интеграционные тесты:

```markdown
## Интеграционные тесты

Интеграционные тесты требуют доступ к реальному API Яндекс.Трекера.

### Настройка

Создать файл `.env` в корне проекта:

```env
TRACKER_API_BASE_URL=https://api.tracker.yandex.net
TRACKER_API_TOKEN=<your_token>
TRACKER_API_ORG_ID=<your_org_id>
```

### Запуск

```bash
# Все интеграционные тесты
npm run test:integration

# Без API токена - тесты будут пропущены (skip)
npm run test:integration  # ⚠️ Tests skipped
```

### CI/CD

В CI/CD pipeline интеграционные тесты автоматически пропускаются,
если не настроены секреты для API.
```

#### 3.4.2. Обновить .env.example

Создать файл `.env.example` с шаблоном:

```env
# Яндекс.Трекер API credentials
# Требуется для интеграционных тестов
TRACKER_API_BASE_URL=https://api.tracker.yandex.net
TRACKER_API_TOKEN=your_oauth_token_here
TRACKER_API_ORG_ID=your_organization_id
```

#### 3.4.3. Обновить package.json scripts

Добавить отдельные команды для разных типов тестов:

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:coverage": "vitest run --coverage",
    "test:coverage:unit": "vitest run tests/unit --coverage"
  }
}
```

---

## Критерии успеха Этапа 3

### Обязательные критерии (Must Have)

```bash
# 1. Все тесты должны проходить или skip
npm test
# Результат: 0 failed (допустимы skipped)

# 2. Coverage должен достичь целей
npx vitest run tests/unit --coverage
# Lines: 76%+
# Functions: 85%+
# Statements: 76%+
# Branches: 75%+

# 3. CI/CD pipeline должен проходить
npm run validate
# Результат: ✅ Success
```

### Желательные критерии (Nice to Have)

- Интеграционные тесты работают с реальным API (если есть токен)
- Все TODO в коде закрыты
- Документация обновлена

---

## Полезные команды

```bash
# Запустить только интеграционные тесты
npm run test:integration

# Запустить только unit тесты с coverage
npm run test:coverage:unit

# Проверить один integration test
npx vitest run tests/integration/mcp/tools/api/issues/get/get-issues.tool.integration.test.ts --reporter=verbose

# Полная валидация проекта
npm run validate

# Проверка покрытия конкретной директории
npx vitest run tests/unit/mcp/search/strategies/ --coverage
```

---

## Финальный чеклист

После завершения всех задач:

- [ ] ✅ Все unit тесты проходят (0 failed)
- [ ] ✅ Интеграционные тесты либо проходят, либо skip (0 failed)
- [ ] ✅ Coverage >= 76% (lines)
- [ ] ✅ Coverage >= 85% (functions)
- [ ] ✅ Coverage >= 76% (statements)
- [ ] ✅ Coverage >= 75% (branches)
- [ ] ✅ `npm run validate` проходит без ошибок
- [ ] ✅ Документация обновлена (tests/README.md, .env.example)
- [ ] ✅ package.json scripts обновлены
- [ ] ✅ Все изменения закоммичены
- [ ] ✅ Изменения запушены на ветку
- [ ] 🎉 Готово к созданию Pull Request!

---

## Следующие шаги после Этапа 3

1. ✅ Создать Pull Request на main branch
2. ✅ Указать в описании PR:
   - Улучшение покрытия с 46% до 76%+
   - Исправление 17 провальных тестов
   - Добавлено X новых unit тестов
3. ✅ Дождаться прохождения CI/CD в PR
4. ✅ Merge в main

---

## Референсы

**Существующие тесты для reference:**
- `tests/unit/mcp/search/strategies/name-search.strategy.test.ts` - шаблон для search strategies
- `tests/integration/mcp/tools/api/issues/get/get-issues.tool.integration.test.ts` - существующий integration test
- `tests/README.md` - руководство по тестированию

**Документация:**
- `CLAUDE.md` - правила проекта
- `src/mcp/search/README.md` - конвенции search engine
- `vitest.config.ts` - конфигурация тестов

---

**Время создания:** 2025-11-16
**Автор анализа:** Claude Code
**Статус:** Готов к выполнению после завершения Этапа 2

---

## Дополнительные замечания

### О провальных тестах

**ВАЖНО:** 17 провальных интеграционных тестов - это критическая проблема, которая должна быть решена в первую очередь на этом этапе. Даже если покрытие будет 100%, но тесты падают - это неприемлемо.

**Рекомендуемый порядок:**
1. **Сначала:** Исправить интеграционные тесты (Задача 3.1)
2. **Затем:** Добавить search strategies тесты (Задача 3.2)
3. **Наконец:** Полировка и документация (Задачи 3.3-3.4)

### О качестве тестов

Не гнаться за 100% coverage - лучше меньше тестов, но качественных:
- Тестировать edge cases
- Тестировать error handling
- Тестировать интеграцию между компонентами
- НЕ тестировать тривиальные getter/setter
- НЕ тестировать интерфейсы (DTO/Entities)
