# Этап 5: Упростить Facade до generic getOperation()

## 🎯 Цель

**Проблема:** Facade содержит методы-прокси для каждой операции. При добавлении новой операции нужно:
1. Создать операцию
2. Добавить метод в Facade ← **модификация Facade**

Это нарушает **Open/Closed Principle** (открыт для расширения, закрыт для модификации).

**Текущий код (строки 46-160 в yandex-tracker.facade.ts):**
```typescript
async ping(): Promise<PingResult> {
  const operation = this.getOperation<{ execute: () => Promise<PingResult> }>('PingOperation');
  return operation.execute();
}

async getIssues(issueKeys: string[]): Promise<BatchIssueResult[]> {
  const operation = this.getOperation<{
    execute: (keys: string[]) => Promise<BatchIssueResult[]>;
  }>('GetIssuesOperation');
  return operation.execute(issueKeys);
}

// ... ещё 6 методов-прокси
```

**Решение:** Упростить Facade до **единственного публичного метода** `getOperation<T>(name)`:

```typescript
export class YandexTrackerFacade {
  constructor(private readonly container: Container) {}

  /**
   * Получить операцию из DI контейнера
   * @param operationName - имя операции (например, 'PingOperation')
   * @returns операция с типом T
   */
  getOperation<T>(operationName: string): T {
    return this.container.get<T>(Symbol.for(operationName));
  }
}
```

**Использование в tools:**
```typescript
// Было
const result = await this.trackerFacade.ping();

// Стало
const pingOp = this.trackerFacade.getOperation<IPingOperation>('PingOperation');
const result = await pingOp.execute();
```

**Преимущества:**
- ✅ Facade не изменяется при добавлении операций
- ✅ Явный контракт через интерфейсы операций
- ✅ Меньше кода в Facade (~160 строк → ~15 строк)

---

## ✅ Что делать

### 1. Прочитать текущую реализацию

**Обязательно прочитай:**
- `src/tracker_api/facade/yandex-tracker.facade.ts`
- `src/mcp/tools/ping.tool.ts` (пример использования Facade)
- `src/mcp/tools/api/issues/get/get-issues.tool.ts`

### 2. Создать интерфейсы для операций

**Новый файл:** `src/tracker_api/api_operations/interfaces.ts`

```typescript
/**
 * Интерфейсы для всех операций
 *
 * Используются:
 * - В Facade для типизации getOperation<T>()
 * - В тестах для создания моков
 * - Для явного контракта операций
 */

import type {
  IssueWithUnknownFields,
  ChangelogEntryWithUnknownFields,
  TransitionWithUnknownFields
} from '@tracker_api/entities/index.js';
import type {
  FindIssuesInputDto,
  CreateIssueDto,
  UpdateIssueDto,
  ExecuteTransitionDto
} from '@tracker_api/dto/index.js';
import type { PingResult } from './user/ping.operation.js';
import type { BatchIssueResult } from './issue/get-issues.operation.js';
import type { FindIssuesResult } from './issue/find/index.js';

// === User Operations ===

export interface IPingOperation {
  execute(): Promise<PingResult>;
}

// === Issue Operations ===

export interface IGetIssuesOperation {
  execute(issueKeys: string[]): Promise<BatchIssueResult[]>;
}

export interface IFindIssuesOperation {
  execute(params: FindIssuesInputDto): Promise<FindIssuesResult>;
}

export interface ICreateIssueOperation {
  execute(issueData: CreateIssueDto): Promise<IssueWithUnknownFields>;
}

export interface IUpdateIssueOperation {
  execute(issueKey: string, updateData: UpdateIssueDto): Promise<IssueWithUnknownFields>;
}

export interface IGetIssueChangelogOperation {
  execute(issueKey: string): Promise<ChangelogEntryWithUnknownFields[]>;
}

export interface IGetIssueTransitionsOperation {
  execute(issueKey: string): Promise<TransitionWithUnknownFields[]>;
}

export interface ITransitionIssueOperation {
  execute(
    issueKey: string,
    transitionId: string,
    transitionData?: ExecuteTransitionDto
  ): Promise<IssueWithUnknownFields>;
}
```

### 3. Экспортировать интерфейсы

**Файл:** `src/tracker_api/api_operations/index.ts`

**Добавить:**
```typescript
// Интерфейсы операций
export type {
  IPingOperation,
  IGetIssuesOperation,
  IFindIssuesOperation,
  ICreateIssueOperation,
  IUpdateIssueOperation,
  IGetIssueChangelogOperation,
  IGetIssueTransitionsOperation,
  ITransitionIssueOperation,
} from './interfaces.js';
```

### 4. Упростить Facade

**Файл:** `src/tracker_api/facade/yandex-tracker.facade.ts`

**Заменить весь файл на:**
```typescript
/**
 * Фасад для работы с API Яндекс.Трекера
 *
 * Ответственность (SRP):
 * - ТОЛЬКО предоставление доступа к операциям через DI контейнер
 * - НЕТ бизнес-логики (всё в операциях)
 * - НЕТ методов-прокси (упрощён до getOperation)
 *
 * КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ (vs старая версия):
 * - Удалены все методы-прокси (ping, getIssues, etc.)
 * - Остался только getOperation<T>(name) — generic доступ
 * - Facade НЕ изменяется при добавлении новых операций (Open/Closed)
 *
 * Паттерн: Service Locator (упрощённая версия)
 */

import type { Container } from 'inversify';

export class YandexTrackerFacade {
  constructor(private readonly container: Container) {}

  /**
   * Получить операцию из DI контейнера
   *
   * @param operationName - имя операции (например, 'PingOperation')
   * @returns операция с типом T
   *
   * @example
   * // Получить PingOperation
   * const pingOp = facade.getOperation<IPingOperation>('PingOperation');
   * const result = await pingOp.execute();
   *
   * @example
   * // Получить GetIssuesOperation
   * const getOp = facade.getOperation<IGetIssuesOperation>('GetIssuesOperation');
   * const issues = await getOp.execute(['QUEUE-123']);
   */
  getOperation<T>(operationName: string): T {
    return this.container.get<T>(Symbol.for(operationName));
  }
}
```

### 5. Обновить PingTool

**Файл:** `src/mcp/tools/ping.tool.ts`

**Добавить импорт:**
```typescript
import type { IPingOperation } from '@tracker_api/api_operations/interfaces.js';
```

**Изменить метод execute:**
```typescript
async execute(_params: ToolCallParams): Promise<ToolResult> {
  try {
    this.logger.info('Проверка подключения к API Яндекс.Трекера...');

    // Получить PingOperation из Facade
    const pingOperation = this.trackerFacade.getOperation<IPingOperation>('PingOperation');
    const response = await pingOperation.execute();

    this.logger.info('Подключение успешно установлено');

    return this.formatSuccess({
      message: response.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return this.formatError('Ошибка при проверке подключения к API Яндекс.Трекера', error);
  }
}
```

### 6. Обновить все остальные tools

**Файлы для обновления:**
- `src/mcp/tools/api/issues/get/get-issues.tool.ts`
- `src/mcp/tools/api/issues/find/find-issues.tool.ts`
- `src/mcp/tools/api/issues/create/create-issue.tool.ts`
- `src/mcp/tools/api/issues/update/update-issue.tool.ts`
- `src/mcp/tools/api/issues/changelog/get-issue-changelog.tool.ts`
- `src/mcp/tools/api/issues/transitions/get/get-issue-transitions.tool.ts`
- `src/mcp/tools/api/issues/transitions/execute/transition-issue.tool.ts`

**Паттерн замены (пример для get-issues.tool.ts):**

**Было:**
```typescript
const results = await this.trackerFacade.getIssues(issueKeys);
```

**Стало:**
```typescript
// Добавить импорт
import type { IGetIssuesOperation } from '@tracker_api/api_operations/interfaces.js';

// В execute()
const getIssuesOp = this.trackerFacade.getOperation<IGetIssuesOperation>('GetIssuesOperation');
const results = await getIssuesOp.execute(issueKeys);
```

**Используй global search and replace:**
```bash
# Найти все использования trackerFacade
grep -r "this.trackerFacade\." src/mcp/tools/
```

### 7. Обновить тесты Facade

**Файл:** `tests/unit/tracker_api/facade/yandex-tracker.facade.test.ts`

**Удалить все тесты методов-прокси** (ping, getIssues, etc.)

**Оставить только тест getOperation:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { Container } from 'inversify';
import { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { IPingOperation } from '@tracker_api/api_operations/interfaces.js';

describe('YandexTrackerFacade', () => {
  it('getOperation должен извлекать операцию из контейнера', () => {
    // Arrange
    const mockContainer = {
      get: vi.fn().mockReturnValue({ execute: vi.fn() }),
    } as unknown as Container;

    const facade = new YandexTrackerFacade(mockContainer);

    // Act
    const operation = facade.getOperation<IPingOperation>('PingOperation');

    // Assert
    expect(mockContainer.get).toHaveBeenCalledWith(Symbol.for('PingOperation'));
    expect(operation).toBeDefined();
    expect(operation.execute).toBeDefined();
  });
});
```

---

## 🧪 Критерии готовности

- [ ] Создан файл `src/tracker_api/api_operations/interfaces.ts` со всеми интерфейсами
- [ ] Интерфейсы экспортированы в `src/tracker_api/api_operations/index.ts`
- [ ] Facade упрощён до единственного метода `getOperation<T>()`
- [ ] Все tools обновлены для использования `getOperation<T>()`
- [ ] Тесты Facade обновлены (удалены тесты методов-прокси)
- [ ] `npm run build` успешен (нет TypeScript ошибок)
- [ ] `npm run test:unit` проходит
- [ ] `npm run validate` проходит

---

## 🔧 Команды для проверки

```bash
# 1. TypeScript компиляция
npm run build

# 2. Unit тесты
npm run test:unit

# 3. Полная валидация
npm run validate

# 4. Проверить что сервер запускается
npm run dev
# Затем Ctrl+C
```

---

## 📝 После выполнения

1. **Закоммитить изменения:**
   ```bash
   git add src/tracker_api/facade/ src/tracker_api/api_operations/interfaces.ts src/mcp/tools/ tests/
   git commit -m "refactor(facade): упростить Facade до generic getOperation()

   Изменения:
   - Создан interfaces.ts со всеми интерфейсами операций
   - Facade упрощён: удалены методы-прокси (ping, getIssues, etc.)
   - Остался только getOperation<T>(name) — generic доступ
   - Tools обновлены для использования getOperation<Interface>()

   Преимущества:
   - Соблюдение Open/Closed Principle (Facade не изменяется при добавлении операций)
   - Явный контракт через интерфейсы
   - Меньше кода (~160 строк → ~40 строк)"
   ```

2. **Удалить этот файл:**
   ```bash
   rm -rf .continuation-prompts/05-refactor-simplify-facade
   ```

3. **Запушить в feature branch:**
   ```bash
   git push -u origin claude/refactor-simplify-facade-<session-id>
   ```

---

## ⚠️ Важные замечания

- **Facade теперь не знает** про конкретные операции — это хорошо (Low Coupling)
- **Tools знают** какие операции им нужны через интерфейсы — это нормально
- **НЕ удаляй** метод `getOperation()` — он нужен для DI контейнера
- **Проверь все tools** — пропущенный tool сломает проект
