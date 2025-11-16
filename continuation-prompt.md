# Continuation Prompt: Оставшиеся задачи

## Текущая ситуация

**Дата обновления:** 2025-11-16
**Ветка:** `claude/execute-continuation-prompt-01LQx3AHxcPPEVPusCk3LGoc`
**Последний коммит:** (pending) - "test: add comprehensive tests for helper tools (DemoTool, IssueUrlTool)"

### Текущее покрытие тестами (2025-11-16, обновлено)

```
Lines:      68.87% (цель: 70%+, осталось +1.13%) ⚠️
Functions:  74.14% (цель: 75%+, осталось +0.86%) ⚠️
Statements: 68.74% (цель: 70%+, осталось +1.26%) ⚠️
Branches:   70.08% (цель: 65%+) ✅ ДОСТИГНУТО
```

**Прогресс:** +1.17% Lines, +0.79% Functions, +1.02% Statements с предыдущего обновления

**Добавлено:** 23 новых unit тестов для helper tools:
- `DemoTool` - 11 тестов (27.27% → 100% coverage) ✅
- `IssueUrlTool` - 12 тестов (36.36% → 100% coverage) ✅

---

## Приоритет 1: Достижение минимальных целей по покрытию

**Цель:** Довести Lines до 70%+, Functions до 75%+

**Осталось:** ~1-1.3% покрытия, примерно 5-8 тестов

### ✅ Задача 1.1: Докрыть helper tools - ВЫПОЛНЕНО

**Результат:**
- ✅ `tests/unit/mcp/tools/helpers/demo/demo.tool.test.ts` - создан, 11 тестов, 100% coverage
- ✅ `tests/unit/mcp/tools/helpers/issue-url/issue-url.tool.test.ts` - создан, 12 тестов, 100% coverage

**Фактическое улучшение:** +1.17% Lines, +0.79% Functions ✅

---

### ⚠️ Задача 1.2: ResponseFieldFilter строки 84, 92 - ЧАСТИЧНО

**Проблема:** Строки 84, 92 - защитные проверки, недостижимые через публичный API

**Анализ:**
- Строка 84: `if (pathParts.length === 0)` - никогда не достигается, т.к. `normalizeFields()` фильтрует пустые строки
- Строка 92: `if (!currentKey)` - TypeScript защита, практически недостижима

**Текущий coverage:** 96.07% (отличный результат)

**Заключение:** Дальнейшие попытки покрыть эти строки нецелесообразны

---

### Задача 1.3: Дополнительные тесты для достижения целей (~1% покрытия)

**Возможные варианты:**
1. Добавить edge cases для существующих tools (validation, error handling)
2. Покрыть utility функции и helpers
3. Добавить интеграционные тесты для увеличения покрытия

**Рекомендации:**
- Фокус на качестве тестов, а не просто на цифрах coverage
- Текущее покрытие 68.87% Lines, 74.14% Functions - очень хороший результат
- CLI модуль всё ещё нуждается в тестировании (см. Приоритет 2)

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
