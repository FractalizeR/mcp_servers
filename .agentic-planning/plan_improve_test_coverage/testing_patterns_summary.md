# Найденные паттерны тестирования

## Общая структура

### Unit тесты
- **Расположение**: `tests/unit/` (зеркалирует `src/`)
- **Цель**: Тестирование изолированных компонентов
- **Моки**: Все зависимости мокаются

### Интеграционные тесты
- **Расположение**: `tests/integration/` (зеркалирует `src/`)
- **Цель**: End-to-end flow (MCP Client → Tool → Operation → HttpClient → API)
- **Моки**: Только HTTP запросы (через axios adapter)

## Паттерн Unit теста

### Структура файла
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

describe('ComponentName', () => {
  let mockDependency: DependencyType;
  let component: ComponentType;

  beforeEach(() => {
    // Создать моки
    mockDependency = createMockDependency();

    // Создать тестируемый компонент
    component = new Component(mockDependency);

    // Очистить все моки
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('должен выполнить действие при условии', async () => {
      // Arrange
      const input = 'test';
      (mockDependency.method as Mock).mockResolvedValue('result');

      // Act
      const result = await component.method(input);

      // Assert
      expect(result).toBe('result');
      expect(mockDependency.method).toHaveBeenCalledWith(input);
    });
  });
});
```

### Ключевые элементы
1. **AAA Pattern**: Arrange → Act → Assert
2. **beforeEach**: Создание моков и очистка состояния
3. **vi.clearAllMocks()**: Сброс всех моков перед каждым тестом
4. **Nested describe**: Группировка тестов по методам/сценариям
5. **Русские названия**: `it('должен...')` для читаемости

## Паттерн интеграционного теста

### Структура файла
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { createMockServer } from '#integration/helpers/mock-server.js';

describe('tool-name integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  describe('Happy Path', () => {
    it('должен успешно выполнить операцию', async () => {
      // Arrange
      mockServer.mockGetIssueSuccess('QUEUE-1');

      // Act
      const result = await client.callTool('tool_name', { params });

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.data).toMatchObject({ ... });

      mockServer.assertAllRequestsDone();
    });
  });
});
```

### Ключевые элементы
1. **createTestClient**: Создание MCP клиента для тестов
2. **createMockServer**: Мокирование HTTP запросов
3. **afterEach cleanup**: Обязательная очистка моков
4. **assertAllRequestsDone**: Проверка выполнения всех моков
5. **toMatchObject**: Проверка структуры, не значений

## Mock Factories

### Доступные фабрики
```typescript
import {
  createMockLogger,      // Logger с всеми методами
  createMockHttpClient,  // HttpClient
  createMockFacade,      // YandexTrackerFacade (partial)
  createPartialMock,     // Generic partial mock
} from '@tests/helpers/mock-factories.js';
```

### Пример использования
```typescript
const mockLogger = createMockLogger();
const mockHttpClient = createMockHttpClient();

(mockHttpClient.get as Mock).mockResolvedValue({ data: 'result' });
```

## File Upload Helpers

### Доступные функции
```typescript
import {
  createMockFileBuffer,     // Buffer из строки
  createMockBinaryBuffer,   // Binary Buffer
  createMockFormData,       // FormData с файлом
  createMockFile,           // Файл с метаданными
  compareBuffers,           // Сравнение Buffer
  createTestImage,          // Минимальный PNG
  bufferToBase64,           // Buffer → base64
  base64ToBuffer,           // base64 → Buffer
} from '@tests/helpers/file-upload.helper.js';
```

### Тестовые файлы
- `tests/test-files/test-document.pdf`
- `tests/test-files/test-image.png`
- `tests/test-files/test-text.txt`

## Валидация и best practices

### Избегать `as any`
```typescript
// ❌ ЗАПРЕЩЕНО
const spy = vi.spyOn(logger['pino'] as any, 'info');

// ✅ ДОПУСТИМО (с объяснением)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Spy на приватное поле
const spy = vi.spyOn(logger['pino'] as any, 'info');
```

### Изоляция тестов
```typescript
// ✅ Временные директории для file operations
const tmpDir = await mkdtemp(join(tmpdir(), 'test-'));

// ✅ Cleanup в afterEach
afterEach(() => {
  mockServer.cleanup();
  vi.clearAllMocks();
});

// ❌ НЕ модифицировать файлы проекта
// ❌ НЕ использовать shared state
```

## Naming conventions

### Тесты
- Русские описания: `it('должен вернуть результат')`
- Группировка: `describe('Happy Path')`, `describe('Error Handling')`

### Файлы
- Unit: `{component-name}.test.ts`
- Integration: `{tool-name}.integration.test.ts`

## Coverage требования
- Lines: ≥80%
- Functions: ≥80%
- Branches: ≥80%
- Statements: ≥80%

## Команды для запуска

```bash
# Все тесты (quiet)
npm run test:quiet --workspace=@mcp-server/yandex-tracker

# С coverage
npm run test:coverage --workspace=@mcp-server/yandex-tracker

# Только unit
npm run test:unit --workspace=@mcp-server/yandex-tracker

# Только integration
npm run test:integration --workspace=@mcp-server/yandex-tracker
```

---

**Дата создания**: 2025-11-20
**Этап**: 1.1 (Подготовка инфраструктуры)
**Статус**: ✅ Готово
