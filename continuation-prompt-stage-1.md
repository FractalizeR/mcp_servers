# Continuation Prompt: Этап 1 - Быстрые победы

## Контекст

Этот файл содержит инструкции для **Этапа 1** улучшения покрытия тестами проекта MCP Server Yandex Tracker.

### Текущая ситуация
**Дата анализа:** 2025-11-16
**Ветка:** `claude/improve-test-coverage-018qgWyfygUQQts4aw8wTnkM`

**Текущее покрытие (unit тесты):**
- Lines: 46.01% → **Цель этапа: 60%+** (нужно +14%)
- Functions: 53.82% → **Цель этапа: 70%+** (нужно +16.18%)
- Statements: 46.18% → **Цель этапа: 60%+** (нужно +13.82%)
- Branches: 43.11% → **Цель этапа: 59%+** (нужно +15.89%)

### Предыдущие этапы
✅ **Анализ покрытия завершён** - см. `/tmp/coverage_recommendations.md` (если доступен)

### Следующие этапы
- ⏭️ **Этап 2**: Основные компоненты (см. `continuation-prompt-stage-2.md`)
- ⏭️ **Этап 3**: Полировка (см. `continuation-prompt-stage-3.md`)

---

## Цели Этапа 1

**Время:** 1-2 дня
**Ожидаемое улучшение:** +15.5% покрытия
**Результат:** ~60% общее покрытие (достижение минимальных целей)

**Приоритет:** Высокий ROI - максимальное улучшение при минимальных усилиях

---

## Задачи

### Задача 1.1: API Operations tests (+12% покрытия)

**Проблема:** Только `get-issues.operation` покрыт на 75%, остальные на 0%

**Что делать:**

Создать unit тесты для следующих операций (по образцу `tests/unit/tracker_api/api_operations/issue/get/get-issues.operation.test.ts`):

1. **changelog.operation.test.ts**
   - Путь: `tests/unit/tracker_api/api_operations/issue/changelog/changelog.operation.test.ts`
   - Тестируемый файл: `src/tracker_api/api_operations/issue/changelog/changelog.operation.ts`
   - Тесты:
     - ✅ should call httpClient.get with correct URL and config
     - ✅ should return changelog array
     - ✅ should handle HTTP errors
     - ✅ should pass logger to BaseOperation
     - ✅ should include requestId in logs

2. **create.operation.test.ts**
   - Путь: `tests/unit/tracker_api/api_operations/issue/create/create.operation.test.ts`
   - Тестируемый файл: `src/tracker_api/api_operations/issue/create/create.operation.ts`
   - Тесты:
     - ✅ should call httpClient.post with correct URL, data and config
     - ✅ should return created issue
     - ✅ should handle validation errors (400)
     - ✅ should handle HTTP errors
     - ✅ should log creation success

3. **find.operation.test.ts**
   - Путь: `tests/unit/tracker_api/api_operations/issue/find/find.operation.test.ts`
   - Тестируемый файл: `src/tracker_api/api_operations/issue/find/find.operation.ts`
   - Тесты:
     - ✅ should call httpClient.post with correct search params
     - ✅ should support query (JQL) search
     - ✅ should support filter search
     - ✅ should support queue search
     - ✅ should support keys search
     - ✅ should handle pagination (page, perPage)
     - ✅ should handle sorting (order)
     - ✅ should return issues array
     - ✅ should handle empty results
     - ✅ should handle HTTP errors

4. **update.operation.test.ts**
   - Путь: `tests/unit/tracker_api/api_operations/issue/update/update.operation.test.ts`
   - Тестируемый файл: `src/tracker_api/api_operations/issue/update/update.operation.ts`
   - Тесты:
     - ✅ should call httpClient.patch with correct URL and data
     - ✅ should return updated issue
     - ✅ should handle validation errors (400)
     - ✅ should handle not found errors (404)
     - ✅ should handle HTTP errors
     - ✅ should log update success

5. **get-transitions.operation.test.ts**
   - Путь: `tests/unit/tracker_api/api_operations/issue/transitions/get-transitions.operation.test.ts`
   - Тестируемый файл: `src/tracker_api/api_operations/issue/transitions/get-transitions.operation.ts`
   - Тесты:
     - ✅ should call httpClient.get with correct URL
     - ✅ should return transitions array
     - ✅ should handle not found errors (404)
     - ✅ should handle HTTP errors

6. **execute-transition.operation.test.ts**
   - Путь: `tests/unit/tracker_api/api_operations/issue/transitions/execute/execute-transition.operation.test.ts`
   - Тестируемый файл: `src/tracker_api/api_operations/issue/transitions/execute/execute-transition.operation.ts`
   - Тесты:
     - ✅ should call httpClient.post with correct URL and transition data
     - ✅ should return updated issue after transition
     - ✅ should handle invalid transition errors (400)
     - ✅ should handle not found errors (404)
     - ✅ should handle HTTP errors
     - ✅ should log transition success

**Шаблон теста для Operation:**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { Logger } from '@infrastructure/logging/logger.js';
import { SomeOperation } from './some.operation.js';

describe('SomeOperation', () => {
  let operation: SomeOperation;
  let mockHttpClient: HttpClient;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new SomeOperation(mockHttpClient, mockLogger);
  });

  it('should call httpClient with correct parameters', async () => {
    const mockResponse = { data: { id: '1', key: 'TEST-1' } };
    vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

    const result = await operation.execute('TEST-1');

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      '/v3/issues/TEST-1',
      expect.objectContaining({
        headers: expect.any(Object),
      })
    );
    expect(result).toEqual(mockResponse.data);
  });

  it('should handle HTTP errors', async () => {
    const error = new Error('API Error');
    vi.mocked(mockHttpClient.get).mockRejectedValue(error);

    await expect(operation.execute('TEST-1')).rejects.toThrow('API Error');
  });
});
```

**Проверка:**
```bash
npm run test:unit -- tests/unit/tracker_api/api_operations/
```

---

### Задача 1.2: YandexTrackerFacade tests (+2% покрытия)

**Проблема:** Facade покрыт только на 33.33%, не покрыты строки 79-159 (основные методы)

**Что делать:**

Расширить существующий тест `tests/unit/tracker_api/facade/yandex-tracker.facade.test.ts`:

**Добавить тесты для методов:**
1. ✅ `findIssues()` - должен вызывать FindIssuesOperation
2. ✅ `createIssue()` - должен вызывать CreateIssueOperation
3. ✅ `updateIssue()` - должен вызывать UpdateIssueOperation
4. ✅ `getIssueChangelog()` - должен вызывать GetIssueChangelogOperation
5. ✅ `getIssueTransitions()` - должен вызывать GetTransitionsOperation
6. ✅ `executeIssueTransition()` - должен вызывать ExecuteTransitionOperation

**Пример теста:**

```typescript
describe('YandexTrackerFacade - findIssues', () => {
  it('should call FindIssuesOperation.execute with correct params', async () => {
    const params = { query: 'status: open', perPage: 50 };
    const mockResult = [{ id: '1', key: 'TEST-1' }];

    vi.mocked(mockFindOperation.execute).mockResolvedValue(mockResult);

    const result = await facade.findIssues(params);

    expect(mockFindOperation.execute).toHaveBeenCalledWith(params);
    expect(result).toEqual(mockResult);
  });

  it('should handle errors from FindIssuesOperation', async () => {
    const error = new Error('Find failed');
    vi.mocked(mockFindOperation.execute).mockRejectedValue(error);

    await expect(facade.findIssues({ query: 'test' })).rejects.toThrow('Find failed');
  });
});
```

**Проверка:**
```bash
npm run test:unit -- tests/unit/tracker_api/facade/
```

---

### Задача 1.3: HTTP Client tests (+1.5% покрытия)

**Проблема:** HTTP Client покрыт на 64.28%, не все сценарии покрыты

**Что делать:**

Расширить `tests/unit/infrastructure/http/client/http-client.test.ts`:

**Добавить тесты:**

1. ✅ **POST method** - should send POST requests correctly
2. ✅ **PUT method** - should send PUT requests correctly
3. ✅ **PATCH method** - should send PATCH requests correctly
4. ✅ **DELETE method** - should send DELETE requests correctly
5. ✅ **Query parameters** - should add query params to URL
6. ✅ **Custom headers** - should merge custom headers with defaults
7. ✅ **Request timeout** - should handle timeout errors
8. ✅ **Network errors** - should handle network errors
9. ✅ **Non-200 status** - should handle non-200 status codes
10. ✅ **Response transformation** - should return response.data

**Пример теста:**

```typescript
describe('HttpClient - POST method', () => {
  it('should send POST request with body', async () => {
    const postData = { title: 'Test Issue' };
    const mockResponse = { data: { id: '1' } };

    vi.mocked(axios.post).mockResolvedValue(mockResponse);

    const result = await httpClient.post('/v3/issues', postData);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v3/issues'),
      postData,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result).toEqual(mockResponse);
  });
});
```

**Проверка:**
```bash
npm run test:unit -- tests/unit/infrastructure/http/client/
```

---

## Критерии успеха Этапа 1

После завершения всех задач запустить:

```bash
# Запустить unit тесты с coverage
npx vitest run tests/unit --coverage

# Проверить метрики (должны быть):
# Lines: 60%+
# Functions: 70%+
# Statements: 60%+
# Branches: 59%+
```

**Ожидаемые результаты:**
- ✅ Все новые тесты проходят
- ✅ Coverage увеличился на ~15%
- ✅ Lines ≥ 60%
- ✅ Functions ≥ 70%
- ✅ Statements ≥ 60%
- ✅ Branches ≥ 59%

---

## Полезные команды

```bash
# Запустить конкретный тест
npx vitest run tests/unit/path/to/test.test.ts

# Запустить тесты в watch mode
npx vitest tests/unit/path/to/test.test.ts

# Проверить coverage для конкретной директории
npx vitest run tests/unit/tracker_api/ --coverage

# Полная валидация проекта
npm run validate
```

---

## Следующие шаги

После завершения Этапа 1:
1. ✅ Закоммитить изменения
2. ✅ Запушить на ветку
3. ➡️ Перейти к **Этапу 2** (см. `continuation-prompt-stage-2.md`)

---

## Референсы

**Существующие тесты для reference:**
- `tests/unit/tracker_api/api_operations/issue/get/get-issues.operation.test.ts` - шаблон для Operations
- `tests/unit/tracker_api/facade/yandex-tracker.facade.test.ts` - существующие тесты Facade
- `tests/unit/infrastructure/http/client/http-client.test.ts` - существующие тесты HTTP Client

**Документация:**
- `tests/README.md` - руководство по тестированию
- `CLAUDE.md` - правила проекта
- `src/tracker_api/api_operations/README.md` - конвенции Operations

---

**Время создания:** 2025-11-16
**Автор анализа:** Claude Code
**Статус:** Готов к выполнению
