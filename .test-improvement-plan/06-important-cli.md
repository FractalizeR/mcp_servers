# Этап 6: CLI тестирование

**Приоритет:** 🟡 ВАЖНО
**Estimate:** 1-2 дня
**Impact:** MEDIUM
**Effort:** MEDIUM

---

## 📊 Текущее состояние

**CLI тестирование:** 0%
**Файлы:** `src/cli/` исключены из coverage

**Структура CLI:**
```
src/cli/
├── index.ts           # Entry point (не тестируется)
└── mcp-connect.ts     # CLI команда (требует тестов)
```

---

## 🎯 Цели

1. Создать unit тесты для CLI логики
2. Покрыть парсинг аргументов
3. Покрыть error handling
4. Достичь 70%+ coverage для CLI

---

## 📋 План действий

### Шаг 1: Анализ CLI кода (1 час)

**Прочитать:**
```bash
cat src/cli/mcp-connect.ts
cat src/index.ts
```

**Определить:**
- Какая логика есть в CLI?
- Что можно тестировать unit тестами?
- Что требует integration подхода?

**Типичные компоненты CLI:**
1. Парсинг аргументов (commander, yargs, minimist)
2. Валидация конфигурации
3. Инициализация зависимостей
4. Error handling
5. Логирование

---

### Шаг 2: Unit тесты для CLI (1 день)

**Структура:**
```
tests/unit/cli/
├── argument-parser.test.ts     # Парсинг аргументов
├── config-validator.test.ts    # Валидация конфигурации
└── error-handler.test.ts       # Обработка ошибок
```

**Пример теста:**

```typescript
// tests/unit/cli/argument-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseCliArguments } from '@cli/mcp-connect.js';

describe('CLI Argument Parser', () => {
  describe('--log-level', () => {
    it('должен парсить валидный log level', () => {
      const args = ['--log-level', 'debug'];
      const config = parseCliArguments(args);
      expect(config.logLevel).toBe('debug');
    });

    it('должен использовать дефолтный log level', () => {
      const config = parseCliArguments([]);
      expect(config.logLevel).toBe('info');
    });

    it('должен отклонить невалидный log level', () => {
      expect(() => parseCliArguments(['--log-level', 'invalid']))
        .toThrow('Invalid log level');
    });

    it('должен поддерживать все уровни', () => {
      const levels = ['error', 'warn', 'info', 'debug', 'trace'];

      levels.forEach(level => {
        const config = parseCliArguments(['--log-level', level]);
        expect(config.logLevel).toBe(level);
      });
    });
  });

  describe('--config', () => {
    it('должен парсить путь к конфигу', () => {
      const args = ['--config', '/path/to/config.json'];
      const config = parseCliArguments(args);
      expect(config.configPath).toBe('/path/to/config.json');
    });

    it('должен использовать дефолтный путь', () => {
      const config = parseCliArguments([]);
      expect(config.configPath).toMatch(/\.config\/yandex-tracker/);
    });
  });

  describe('Environment variables', () => {
    it('должен читать YANDEX_TRACKER_TOKEN из env', () => {
      process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';

      const config = parseCliArguments([]);
      expect(config.token).toBe('test-token');

      delete process.env['YANDEX_TRACKER_TOKEN'];
    });

    it('должен приоритизировать --token над env', () => {
      process.env['YANDEX_TRACKER_TOKEN'] = 'env-token';

      const config = parseCliArguments(['--token', 'cli-token']);
      expect(config.token).toBe('cli-token');

      delete process.env['YANDEX_TRACKER_TOKEN'];
    });
  });
});
```

**Чек-лист:**
- [ ] Создать tests/unit/cli/
- [ ] Тесты для парсинга аргументов
- [ ] Тесты для environment variables
- [ ] Тесты для валидации конфигурации
- [ ] Тесты для error handling
- [ ] Запустить `npm run test:unit`

---

### Шаг 3: Рефакторинг для тестируемости (если нужно)

**Проблема:** CLI часто смешивает логику и I/O

**Плохо (сложно тестировать):**
```typescript
// src/cli/mcp-connect.ts
async function main() {
  const args = process.argv.slice(2); // ❌ Прямой доступ к process.argv
  const token = process.env['TOKEN']; // ❌ Прямой доступ к env

  if (!token) {
    console.error('Token required'); // ❌ Прямой console
    process.exit(1); // ❌ process.exit
  }

  const server = new McpServer(token);
  await server.start();
}

main();
```

**Хорошо (легко тестировать):**
```typescript
// src/cli/mcp-connect.ts
export interface CliConfig {
  token: string;
  logLevel: string;
}

export function parseCliArguments(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): CliConfig {
  // Чистая функция, легко тестировать
  const token = argv.includes('--token')
    ? argv[argv.indexOf('--token') + 1]
    : env['YANDEX_TRACKER_TOKEN'];

  if (!token) {
    throw new Error('Token is required');
  }

  return { token, logLevel: 'info' };
}

export async function runCli(config: CliConfig): Promise<void> {
  // Бизнес-логика, можно тестировать
  const server = new McpServer(config.token);
  await server.start();
}

// Entry point (НЕ тестируется)
async function main() {
  try {
    const config = parseCliArguments();
    await runCli(config);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

**Чек-лист рефакторинга:**
- [ ] Извлечь parseCliArguments() как чистую функцию
- [ ] Извлечь runCli() как тестируемую функцию
- [ ] Оставить только I/O в main()
- [ ] Обновить тесты

---

### Шаг 4: Обновить coverage конфигурацию (15 мин)

**Убрать CLI из exclude:**

```typescript
// vitest.config.ts
coverage: {
  exclude: [
    'node_modules/',
    'dist/',
    'tests/',
    'src/index.ts', // Entry point остается исключенным
    // Убрать: 'src/cli/' — теперь покрыто
  ],
}
```

**Проверить coverage:**
```bash
npm run test:coverage

# Проверить CLI покрытие
open coverage/src/cli/index.html
```

**Чек-лист:**
- [ ] Убрать src/cli/ из exclude
- [ ] Запустить coverage
- [ ] Проверить CLI coverage ≥70%

---

## ✅ Критерии завершения

### Must Have
- [x] Unit тесты для CLI созданы
- [x] CLI coverage ≥70%
- [x] CLI убран из coverage exclude
- [x] Тесты проходят

### Should Have
- [x] Рефакторинг для тестируемости (если нужно)
- [x] Тесты для всех аргументов
- [x] Тесты для env variables

### Nice to Have
- [ ] Integration тесты (запуск CLI)
- [ ] Тесты для graceful shutdown

---

## 📝 Шаблон для PR

```markdown
# CLI тестирование

## Изменения
- ✅ Добавлены unit тесты для CLI
- ✅ Рефакторинг CLI для тестируемости
- ✅ CLI убран из coverage exclude

## Метрики
| Метрика | До | После |
|---------|-----|-------|
| CLI coverage | 0% | 75% |
| CLI unit тестов | 0 | 15+ |

## Проверка
- [x] `npm run test:unit` проходит
- [x] CLI coverage ≥70%

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

**Следующий этап:** [07-future-performance.md](./07-future-performance.md)
