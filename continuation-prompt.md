# Continuation Prompt: Оставшиеся задачи

## Текущая ситуация

**Дата обновления:** 2025-11-16
**Ветка:** `claude/implement-missing-features-015Zz4v3NyuVVDtEbxzr21Q7`
**Последний коммит:** `bfd28e1` - "test: улучшить покрытие unit тестами (+1.87% Lines, +6.08% Functions)"

### Текущее покрытие тестами (2025-11-16)

```
Lines:      67.7%  (цель: 70%+, осталось +2.3%)
Functions:  73.35% (цель: 75%+, осталось +1.65%)
Statements: 67.72% (цель: 70%+, осталось +2.28%)
Branches:   69.52% (цель: 65%+) ✅ ДОСТИГНУТО
```

**Прогресс:** +1.87% Lines, +6.08% Functions, +1.89% Statements с предыдущего обновления

**Добавлено:** 27 новых unit тестов (FindIssuesOperation, ResponseFieldFilter, BaseDefinition, WeightedCombinedStrategy)

---

## Приоритет 1: Достижение минимальных целей по покрытию

**Цель:** Довести Lines до 70%+, Functions до 75%+

**Осталось:** ~2-3% покрытия, примерно 10-15 тестов

### Задача 1.1: Докрыть helper tools (~1% покрытия)

**Проблема:** DemoTool и IssueUrlTool имеют низкое покрытие

**Файлы для тестов:**
- `tests/unit/mcp/tools/helpers/demo/demo.tool.test.ts` (создать)
- `tests/unit/mcp/tools/helpers/issue-url/issue-url.tool.test.ts` (создать)

**Что добавить:**
```typescript
// DemoTool tests (27.27% → 90%+)
describe('DemoTool', () => {
  it('should return greeting with default name', async () => {
    const result = await demoTool.execute({});
    expect(result.content[0].text).toContain('Hello, World!');
  });

  it('should return greeting with custom name', async () => {
    const result = await demoTool.execute({ name: 'Alice' });
    expect(result.content[0].text).toContain('Hello, Alice!');
  });

  it('should include timestamp', async () => {
    const result = await demoTool.execute({});
    expect(result.content[0].text).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

// IssueUrlTool tests (36.36% → 90%+)
describe('IssueUrlTool', () => {
  it('should generate URL for single issue key', async () => {
    const result = await tool.execute({ issueKeys: ['TEST-123'] });
    expect(result.content[0].text).toContain('https://tracker.yandex.ru/TEST-123');
  });

  it('should generate URLs for multiple issues', async () => {
    const result = await tool.execute({ issueKeys: ['TEST-1', 'TEST-2'] });
    // ...
  });

  it('should validate issue key format', async () => {
    const result = await tool.execute({ issueKeys: ['invalid'] });
    expect(result.isError).toBe(true);
  });
});
```

**Ожидаемое улучшение:** +1% Lines, +1.5% Functions

---

### Задача 1.2: Докрыть ResponseFieldFilter строки 84, 92 (~0.5% покрытия)

**Проблема:** Две строки в ResponseFieldFilter не покрыты

**Файл:** Расширить `tests/unit/mcp/utils/response-field-filter.test.ts`

**Анализ непокрытых строк:**
- Строка 84: `if (pathParts.length === 0) return;` - early return в extractField
- Строка 92: `if (!currentKey) return;` - проверка undefined currentKey

**Что добавить:**
```typescript
it('should handle edge case with empty path parts', () => {
  // Прямое тестирование extractField через публичный API
  const data = { key: 'value' };
  const result = ResponseFieldFilter.filter(data, ['']);
  // Должен игнорировать пустой путь
  expect(result).toEqual({});
});
```

**Ожидаемое улучшение:** +0.3% Lines

---

### Задача 1.3: Докрыть infrastructure слой (~1% покрытия)

**Файлы с низким покрытием:**
- `src/infrastructure/async/parallel-executor.ts` - имеет 1 flaky тест
- `src/infrastructure/cache/cache-manager.ts` - возможно недокрыты edge cases

**Что сделать:**
1. Исправить flaky тест в `parallel-executor.test.ts` (строка 567)
2. Добавить edge cases для CacheManager

**Ожидаемое улучшение:** +0.5% Lines, +0.5% Functions

---

## Приоритет 2: CLI тестирование (высокий приоритет)

**Статус:** НЕ НАЧАТО

**Контекст:** CLI инструмент полностью реализован, протестирован вручную, но unit тесты отсутствуют

### Задача 2.1: Unit тесты для коннекторов

**Файлы для создания:**
- `tests/unit/cli/connectors/claude-desktop/claude-desktop.connector.test.ts`
- `tests/unit/cli/connectors/claude-code/claude-code.connector.test.ts`
- `tests/unit/cli/connectors/codex/codex.connector.test.ts`
- `tests/unit/cli/connectors/registry.test.ts`

**Что тестировать:**
- Чтение/запись JSON конфигов (Claude Desktop)
- Вызов CLI команд (Claude Code)
- TOML операции (Codex)
- Поиск установленных клиентов (Registry)

**Инструменты:** Vitest, mock'и для fs/promises, child_process

---

### Задача 2.2: Unit тесты для команд

**Файлы для создания:**
- `tests/unit/cli/commands/connect.command.test.ts`
- `tests/unit/cli/commands/disconnect.command.test.ts`
- `tests/unit/cli/commands/status.command.test.ts`
- `tests/unit/cli/commands/list.command.test.ts`

**Что тестировать:**
- Логика команд
- Интеграция с коннекторами
- Обработка ошибок
- Mock для inquirer (интерактивные вопросы)

---

### Задача 2.3: Интеграционные тесты CLI

**Файл:** `tests/integration/cli/cli.integration.test.ts`

**Что тестировать:**
- Реальное создание конфигов в временной директории
- E2E flow: connect → status → disconnect
- Проверка корректности сгенерированных файлов

---

## Приоритет 3: Улучшения и документация (средний приоритет)

### Задача 3.1: Обновить continuation-prompt.md после достижения целей

После выполнения Приоритета 1:
- Обновить цифры покрытия
- Отметить выполненные задачи
- Добавить новые задачи если появятся

### Задача 3.2: Документация (опционально)

- Обновить README.md с примерами использования
- Добавить FAQ.md
- Создать CONTRIBUTING.md (если планируется open source)

---

## План выполнения

### Быстрый путь к минимальным целям (70% Lines, 75% Functions)

**Шаг 1:** Helper tools tests (1 час) → +1% Lines, +1.5% Functions
**Шаг 2:** ResponseFieldFilter edge cases (30 мин) → +0.3% Lines
**Шаг 3:** Infrastructure edge cases (1 час) → +0.5% Lines, +0.5% Functions
**Шаг 4:** Запустить coverage, проверить достижение целей

**Итого:** ~2.5-3 часа работы → **70%+ Lines, 75%+ Functions**

### Путь к CLI тестированию

**Шаг 5:** Connector tests (3-4 часа) → полное покрытие коннекторов
**Шаг 6:** Command tests (2-3 часа) → полное покрытие команд
**Шаг 7:** Integration tests (1-2 часа) → E2E тесты

**Итого:** ~6-9 часов → CLI покрыт тестами на 80%+

---

## Полезные команды

```bash
# Запустить unit тесты с coverage
npm run test:unit -- --coverage

# Запустить конкретный тест
npx vitest run tests/unit/path/to/test.test.ts

# Запустить тесты в watch mode
npx vitest tests/unit/path/to/test.test.ts

# Проверить coverage для конкретной директории
npx vitest run tests/unit/mcp/tools/helpers/ --coverage

# Полная валидация проекта
npm run validate
```

---

## Критерии успеха

**Минимальные (MUST) - Приоритет 1:**
- ✅ Lines ≥ 70%
- ✅ Functions ≥ 75%
- ✅ Statements ≥ 70%
- ✅ Branches ≥ 65% (уже достигнуто)
- ✅ Все unit тесты проходят

**Желательные (SHOULD) - Приоритет 2:**
- ✅ CLI покрыт unit тестами на 80%+
- ✅ Все коннекторы протестированы
- ✅ Все команды протестированы

**Идеальные (COULD) - Приоритет 3:**
- ✅ Lines ≥ 80%
- ✅ Functions ≥ 85%
- ✅ Интеграционные тесты CLI
- ✅ Обновлена документация

---

## Референсы

**Существующие тесты для reference:**
- `tests/unit/mcp/tools/api/issues/get/get-issues.tool.test.ts` - шаблон для tool tests
- `tests/unit/tracker_api/api_operations/issue/get/get-issues.operation.test.ts` - шаблон для operations
- `tests/unit/mcp/search/strategies/weighted-combined.strategy.test.ts` - пример полного покрытия

**Документация:**
- `tests/README.md` - руководство по тестированию
- `CLAUDE.md` - правила проекта
- `ARCHITECTURE.md` - архитектура проекта
- `src/cli/README.md` - архитектура CLI

---

**Последнее обновление:** 2025-11-16
**Автор:** Claude Code
**Статус:** В процессе - фокус на достижении минимальных целей по покрытию
