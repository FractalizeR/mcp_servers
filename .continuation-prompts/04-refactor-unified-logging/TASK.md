# Этап 4: Унифицировать логирование (CLI + Server)

## 🎯 Цель

**Проблема:** CLI и Server используют разные логгеры без общего интерфейса:
- **Server** → `infrastructure/logging/` (Pino + файлы + rotation)
- **CLI** → `cli/utils/logger.ts` (Chalk + Ora для терминала)

**Это затрудняет:**
- Переиспользование кода между CLI и Server
- Тестирование (разные API логгеров)
- Добавление новых логгеров (нет контракта)

**Решение:**
1. Создать общий интерфейс `ILogger`
2. Адаптировать существующий `Logger` (Pino) к интерфейсу
3. Создать `CLILogger` (Chalk + Ora) реализующий тот же интерфейс
4. Обновить CLI команды для использования `ILogger`

---

## ✅ Что делать

### 1. Прочитать текущую реализацию

**Обязательно прочитай:**
- `src/infrastructure/logging/logger.ts` — Server logger (Pino)
- `src/cli/utils/logger.ts` — CLI logger (Chalk + Ora)
- `src/cli/commands/*.ts` — использование CLI logger

### 2. Создать ILogger интерфейс

**Новый файл:** `src/infrastructure/logging/logger.interface.ts`

```typescript
/**
 * Базовый интерфейс для всех логгеров в проекте
 *
 * Реализации:
 * - Logger (Pino) — для MCP сервера (structured JSON logs, файлы)
 * - CLILogger (Chalk + Ora) — для CLI (цветной вывод, spinners)
 */
export interface ILogger {
  /**
   * Информационное сообщение
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Предупреждение
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Ошибка
   */
  error(message: string, ...args: unknown[]): void;

  /**
   * Отладочное сообщение (показывается только при logLevel = debug)
   */
  debug(message: string, ...args: unknown[]): void;

  /**
   * Успешное завершение операции (опционально для CLI)
   */
  success?(message: string, ...args: unknown[]): void;
}
```

### 3. Адаптировать существующий Logger (Pino) к ILogger

**Файл:** `src/infrastructure/logging/logger.ts`

**Добавить в начало файла:**
```typescript
import type { ILogger } from './logger.interface.js';
```

**Изменить объявление класса:**
```typescript
// Было
export class Logger {

// Стало
export class Logger implements ILogger {
```

**Проверить что все методы ILogger реализованы:**
- ✅ `info()` — уже есть
- ✅ `warn()` — уже есть
- ✅ `error()` — уже есть
- ✅ `debug()` — уже есть
- ❌ `success()` — добавить как алиас для `info()`

**Добавить метод success:**
```typescript
/**
 * Успешное завершение операции (алиас для info)
 */
success(message: string, ...args: unknown[]): void {
  this.info(message, ...args);
}
```

### 4. Обновить экспорты

**Файл:** `src/infrastructure/logging/index.ts`

```typescript
export { Logger } from './logger.js';
export type { ILogger } from './logger.interface.js';
export type { LoggerConfig } from './logger.js';
```

### 5. Создать CLILogger

**Новый файл:** `src/cli/utils/cli-logger.ts`

```typescript
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import type { ILogger } from '@infrastructure/logging/logger.interface.js';

/**
 * CLI Logger — реализация ILogger для интерактивного терминала
 *
 * Использует:
 * - Chalk для цветного вывода
 * - Ora для spinner анимаций
 */
export class CLILogger implements ILogger {
  private spinner: Ora | null = null;

  info(message: string, ...args: unknown[]): void {
    if (this.spinner) {
      this.spinner.stop();
    }
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    } else {
      console.log(chalk.green('✔'), message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.spinner) {
      this.spinner.stop();
    }
    console.warn(chalk.yellow('⚠'), message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    } else {
      console.error(chalk.red('✖'), message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG === 'true') {
      console.log(chalk.gray('🔍'), message, ...args);
    }
  }

  /**
   * Начать spinner для длительной операции
   */
  startSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.stop();
    }
    this.spinner = ora(message).start();
  }

  /**
   * Обновить текст spinner
   */
  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  /**
   * Остановить spinner без сообщения
   */
  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}
```

### 6. Обновить CLI команды

**Файлы для обновления:**
- `src/cli/commands/connect.command.ts`
- `src/cli/commands/disconnect.command.ts`
- `src/cli/commands/status.command.ts`
- `src/cli/commands/list.command.ts`
- `src/cli/commands/validate.command.ts`

**Найти все использования старого logger:**
```bash
grep -r "logger\." src/cli/commands/
```

**Было (пример из connect.command.ts):**
```typescript
import { logger } from '../utils/logger.js';

// Использование
logger.info('Подключение к клиенту...');
logger.success('Подключение успешно!');
logger.error('Ошибка:', error);
```

**Стало:**
```typescript
import { CLILogger } from '../utils/cli-logger.js';
import type { ILogger } from '@infrastructure/logging/logger.interface.js';

// Создать logger в начале команды
const logger: ILogger = new CLILogger();

// Использование (API не изменился)
logger.info('Подключение к клиенту...');
logger.success('Подключение успешно!');
logger.error('Ошибка:', error);
```

### 7. Удалить старый CLI logger

**Файл для удаления:** `src/cli/utils/logger.ts`

**Проверь что он больше не используется:**
```bash
grep -r "from.*cli/utils/logger" src/
```

Если не найдено — удаляй:
```bash
rm src/cli/utils/logger.ts
```

### 8. Обновить тесты (если есть)

**Файлы:**
- `tests/unit/cli/commands/*.test.ts`
- `tests/unit/infrastructure/logging/logger.test.ts`

**Моки для ILogger:**
```typescript
const mockLogger: ILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  success: vi.fn(),
};
```

---

## 🧪 Критерии готовности

- [ ] Создан интерфейс `ILogger` в `src/infrastructure/logging/logger.interface.ts`
- [ ] Класс `Logger` (Pino) реализует `ILogger`
- [ ] Создан `CLILogger` в `src/cli/utils/cli-logger.ts`
- [ ] CLI команды используют `CLILogger` вместо старого logger
- [ ] Старый `src/cli/utils/logger.ts` удалён
- [ ] Тесты обновлены (если есть)
- [ ] `npm run build` успешен
- [ ] `npm run test:unit` проходит (если есть CLI тесты)
- [ ] CLI команды работают: `npm run mcp:status`, `npm run mcp:list`

---

## 🔧 Команды для проверки

```bash
# 1. TypeScript компиляция
npm run build

# 2. Проверить CLI команды
npm run mcp:status
npm run mcp:list

# 3. Unit тесты (если есть)
npm run test:unit

# 4. Полная валидация
npm run validate
```

---

## 📝 После выполнения

1. **Закоммитить изменения:**
   ```bash
   git add src/infrastructure/logging/ src/cli/utils/ src/cli/commands/
   git commit -m "refactor(logging): унифицировать логирование через ILogger интерфейс

   Изменения:
   - Создан общий интерфейс ILogger
   - Logger (Pino) реализует ILogger
   - CLILogger (Chalk + Ora) реализует ILogger
   - CLI команды используют CLILogger
   - Удалён старый cli/utils/logger.ts

   Преимущества:
   - Единый контракт для всех логгеров
   - Лег переиспользование кода между CLI и Server
   - Упрощённое тестирование (мокается ILogger)"
   ```

2. **Удалить этот файл:**
   ```bash
   rm -rf .continuation-prompts/04-refactor-unified-logging
   ```

3. **Запушить в feature branch:**
   ```bash
   git push -u origin claude/refactor-unified-logging-<session-id>
   ```

---

## ⚠️ Важные замечания

- **НЕ изменяй логику** существующего Logger (Pino) — только добавь `implements ILogger`
- **CLILogger** должен поддерживать spinners (Ora) — это важно для UX
- **Метод success()** опционален в интерфейсе — не все логгеры его поддерживают
- **Проверь CLI команды вручную** — автоматических тестов может не быть
