# Анализ текущего состояния - Результаты этапа 0.1

**Дата:** 2025-11-20
**Этап:** 0.1 - Анализ текущего состояния (Sequential)
**Статус:** ✅ Завершено

---

## 1. Список всех инструментов и их структура

### Обзор

В проекте найдено **57 инструментов** в директории `packages/servers/yandex-tracker/src/tools/api/`.

### Категории инструментов

| Категория | Количество | Примеры |
|-----------|------------|---------|
| **bulk-change** | 4 | bulk-move-issues, bulk-transition-issues, bulk-update-issues, get-bulk-change-status |
| **checklists** | 4 | add-checklist-item, delete-checklist-item, get-checklist, update-checklist-item |
| **comments** | 4 | add-comment, delete-comment, edit-comment, get-comments |
| **components** | 4 | create-component, delete-component, get-components, update-component |
| **issues** | 16 | create-issue, get-issues, find-issues, update-issue, get-issue-changelog, + attachments (5), + links (3), + transitions (2) |
| **projects** | 5 | create-project, delete-project, get-project, get-projects, update-project |
| **queues** | 6 | create-queue, get-queue, get-queues, get-queue-fields, manage-queue-access, update-queue |
| **worklog** | 4 | add-worklog, delete-worklog, get-worklogs, update-worklog |

### Типичная структура одного инструмента

✅ **Все инструменты следуют единому паттерну:**

```
tool-name/
├── tool-name.tool.ts        # Основной класс (extends BaseTool)
├── tool-name.schema.ts      # Zod схема валидации параметров
├── tool-name.definition.ts  # MCP definition (extends BaseToolDefinition)
├── tool-name.metadata.ts    # Статические метаданные (StaticToolMetadata)
└── index.ts                 # Экспорт инструмента
```

**Файлы:**

- **`*.tool.ts`** - Основной класс инструмента, наследуется от `BaseTool<YandexTrackerFacade>`
  - Метод `buildDefinition(): ToolDefinition` - вызывает definition.build()
  - Метод `execute(params: ToolCallParams): Promise<ToolResult>` - бизнес-логика
  - Использует `this.validateParams(params, Schema)` для валидации

- **`*.schema.ts`** - Zod схема для валидации параметров
  - Экспортирует `const ParamsSchema = z.object({ ... })`
  - Экспортирует `type Params = z.infer<typeof ParamsSchema>`
  - Определяет обязательные и опциональные поля через `.optional()`

- **`*.definition.ts`** - MCP definition для описания инструмента
  - Класс наследуется от `BaseToolDefinition`
  - Метод `build(): ToolDefinition` строит JSON Schema для MCP
  - Методы `buildXxxParam()` для построения каждого параметра
  - Возвращает `{ name, description, inputSchema: { type, properties, required } }`

- **`*.metadata.ts`** - Статические метаданные
  - Экспортирует `const TOOL_METADATA: StaticToolMetadata`
  - Содержит: name, description, category, priority, tags, isHelper, requiresExplicitUserConsent
  - Разрывает циркулярную зависимость между tool.ts и definition.ts

---

## 2. Типичный паттерн создания инструмента

### Workflow создания инструмента

1. **Создать metadata** (tool-name.metadata.ts)
2. **Создать Zod schema** (tool-name.schema.ts)
3. **Создать MCP definition** (tool-name.definition.ts) - вручную!
4. **Создать tool class** (tool-name.tool.ts)
5. **Создать index.ts** для экспорта

### Пример: TransitionIssueTool

#### 1. Metadata (transition-issue.metadata.ts)
```typescript
export const TRANSITION_ISSUE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('transition_issue', MCP_TOOL_PREFIX),
  description: '[Issues/Workflow] Выполнить переход задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'workflow',
  priority: ToolPriority.HIGH,
  tags: ['transition', 'status', 'workflow', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
```

#### 2. Zod Schema (transition-issue.schema.ts)
```typescript
export const TransitionIssueParamsSchema = z.object({
  issueKey: IssueKeySchema,                                 // REQUIRED
  transitionId: z.string().min(1, 'Не может быть пустым'), // REQUIRED
  comment: z.string().optional(),                           // OPTIONAL
  customFields: z.record(z.string(), z.unknown()).optional(), // OPTIONAL
  fields: FieldsSchema.optional(),                          // OPTIONAL
});
```

#### 3. MCP Definition (transition-issue.definition.ts)
```typescript
export class TransitionIssueDefinition extends BaseToolDefinition {
  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: this.buildIssueKeyParam(),
          transitionId: this.buildTransitionIdParam(),
          comment: this.buildCommentParam(),
          customFields: this.buildCustomFieldsParam(),
          fields: this.buildFieldsParam(),              // ⚠️ КРИТИЧНО: должно соответствовать schema!
        },
        required: ['issueKey', 'transitionId'],          // ⚠️ КРИТИЧНО: должно соответствовать schema!
      },
    };
  }

  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Поля для возврата. Указывайте минимум для экономии токенов.',
      this.buildStringParam('Имя поля', { minLength: 1, examples: ['key', 'summary'] }),
      { minItems: 1, examples: [['key', 'summary', 'status']] }
    );
  }
}
```

#### 4. Tool Class (transition-issue.tool.ts)
```typescript
export class TransitionIssueTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = TRANSITION_ISSUE_TOOL_METADATA;

  private readonly definition = new TransitionIssueDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация через Zod
    const validation = this.validateParams(params, TransitionIssueParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    // 2. Бизнес-логика...
  }
}
```

---

## 3. Паттерн бага - Несоответствие Zod Schema ↔ MCP Definition

### Описание бага (коммит de41f2c)

**Проблема:** 4 инструмента в папке `queues` объявляли параметр `fields` в Zod схеме, но НЕ объявляли его в MCP definition.

**Пострадавшие инструменты:**
1. `get-queue-fields` - обязательный параметр `fields: FieldsSchema`
2. `create-queue` - опциональный параметр `fields: FieldsSchema.optional()`
3. `update-queue` - опциональный параметр `fields: FieldsSchema.optional()`
4. `manage-queue-access` - опциональный параметр `fields: FieldsSchema.optional()`

### Анатомия бага

#### ДО исправления (get-queue-fields.schema.ts)
```typescript
export const GetQueueFieldsParamsSchema = z.object({
  queueId: z.string().min(1, 'Queue ID не может быть пустым'),
  fields: FieldsSchema,  // ✅ Объявлено в Zod schema (REQUIRED)
});
```

#### ДО исправления (get-queue-fields.definition.ts)
```typescript
build(): ToolDefinition {
  return {
    name: this.getToolName(),
    description: this.wrapWithSafetyWarning(this.buildDescription()),
    inputSchema: {
      type: 'object',
      properties: {
        queueId: this.buildQueueIdParam(),
        // ❌ fields ОТСУТСТВУЕТ в properties!
      },
      required: ['queueId'],  // ❌ fields ОТСУТСТВУЕТ в required!
    },
  };
}
```

#### Последствия

1. **MCP клиенты НЕ знают о параметре `fields`**
   - LLM агенты не видят параметр в definition
   - Параметр не передается через MCP протокол

2. **Внутренняя валидация через Zod работает**
   - Если параметр передан напрямую в execute() - валидация сработает
   - Но через MCP параметр никогда не придет

3. **Инструмент работает некорректно**
   - Без параметра `fields` возвращаются ВСЕ поля
   - Увеличивается потребление токенов
   - Нарушается контракт API

### Исправление (коммит de41f2c)

#### ПОСЛЕ исправления (get-queue-fields.definition.ts)
```typescript
build(): ToolDefinition {
  return {
    name: this.getToolName(),
    description: this.wrapWithSafetyWarning(this.buildDescription()),
    inputSchema: {
      type: 'object',
      properties: {
        queueId: this.buildQueueIdParam(),
        fields: this.buildFieldsParam(),  // ✅ Добавлен в properties
      },
      required: ['queueId', 'fields'],    // ✅ Добавлен в required
    },
  };
}

private buildFieldsParam(): Record<string, unknown> {
  return this.buildArrayParam(
    '⚠️ ОБЯЗАТЕЛЬНЫЙ. Поля для возврата. Указывайте минимум для экономии токенов.',
    this.buildStringParam('Имя поля', {
      minLength: 1,
      examples: ['id', 'key', 'name', 'type', 'required'],
    }),
    {
      minItems: 1,
      examples: [
        ['id', 'key', 'name'],
        ['id', 'key', 'name', 'type', 'required'],
      ],
    }
  );
}
```

### Типы потенциальных несоответствий

| Тип несоответствия | Пример | Последствия |
|-------------------|--------|-------------|
| **Отсутствие поля в definition.properties** | schema: `fields: FieldsSchema`<br>definition: нет `fields` | MCP клиенты не знают о параметре |
| **Отсутствие поля в definition.required** | schema: `fields: FieldsSchema` (required)<br>definition.required: `['queueId']` (без fields) | MCP считает параметр опциональным, валидация Zod требует обязательный |
| **Разные типы данных** | schema: `perPage: z.number()`<br>definition: `type: 'string'` | Валидация Zod провалится, если MCP передаст string |
| **Разные имена полей** | schema: `issueId`<br>definition: `issueKey` | Параметр не найдется, валидация провалится |
| **Разная optional/required логика** | schema: `fields.optional()`<br>definition.required: `['fields']` | Zod разрешает undefined, MCP требует значение |

---

## 4. Архитектура генератора definition

### Цель

Автоматически генерировать MCP definition из Zod schema, исключая возможность несоответствия.

### Расположение

**Пакет:** `@mcp-framework/core` (`packages/framework/core`)
**Модуль:** `src/definition/`

```
packages/framework/core/src/definition/
├── schema-to-definition.ts       # Основной генератор
├── zod-json-schema-adapter.ts    # Адаптер для zod-to-json-schema
├── definition-validator.ts       # Валидация сгенерированного definition
└── index.ts                      # Экспорты
```

### API генератора

#### Основная функция

```typescript
/**
 * Генерирует MCP definition из Zod схемы
 *
 * @param schema - Zod схема параметров (z.object({ ... }))
 * @param options - Опциональные настройки генерации
 * @returns JSON Schema совместимый с MCP inputSchema
 */
export function generateDefinitionFromSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  options?: SchemaToDefinitionOptions
): ToolInputSchema;

export interface SchemaToDefinitionOptions {
  /**
   * Включить descriptions из .describe()
   * @default true
   */
  includeDescriptions?: boolean;

  /**
   * Добавить examples из метаданных Zod
   * @default true
   */
  includeExamples?: boolean;

  /**
   * Строгий режим (проверяет дополнительные ограничения)
   * @default false
   */
  strict?: boolean;

  /**
   * Кастомные трансформации для определенных типов
   */
  customTransforms?: Record<string, (zodType: z.ZodTypeAny) => Record<string, unknown>>;
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}
```

#### Вспомогательные функции

```typescript
/**
 * Извлечь список required полей из Zod схемы
 */
export function extractRequiredFields<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): string[];

/**
 * Проверить соответствие Zod schema и MCP definition
 * Используется в тестах
 */
export function validateSchemaDefinitionMatch<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  definition: ToolInputSchema
): ValidationResult;

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  type: 'missing_property' | 'required_mismatch' | 'type_mismatch' | 'structure_mismatch';
  field: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}
```

### Интеграция с BaseTool

#### Опция 1: Автоматическая генерация (рекомендуется)

```typescript
export abstract class BaseTool<TFacade = unknown> {
  /**
   * NEW: Автоматическая генерация definition из schema
   * Если переопределен, используется вместо buildDefinition()
   */
  protected getParamsSchema?(): z.ZodObject<z.ZodRawShape>;

  /**
   * DEPRECATED: Ручное построение definition
   * Используется только если getParamsSchema() не определен
   */
  protected abstract buildDefinition(): ToolDefinition;

  public getDefinition(): ToolDefinition {
    // Приоритет 1: Автоматическая генерация из schema
    const schema = this.getParamsSchema?.();
    if (schema) {
      const inputSchema = generateDefinitionFromSchema(schema);
      return {
        name: this.getToolName(),
        description: this.getDescription(),
        inputSchema,
      };
    }

    // Приоритет 2: Ручное определение (legacy)
    return this.buildDefinition();
  }
}
```

**Использование в инструменте:**

```typescript
export class TransitionIssueTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = TRANSITION_ISSUE_TOOL_METADATA;

  // ✅ NEW: Просто вернуть схему
  protected getParamsSchema() {
    return TransitionIssueParamsSchema;
  }

  // ❌ DEPRECATED: buildDefinition() больше не нужен
  // protected buildDefinition(): ToolDefinition {
  //   return this.definition.build();
  // }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, TransitionIssueParamsSchema);
    // ...
  }
}
```

#### Опция 2: Явная генерация в Definition классе

```typescript
export class TransitionIssueDefinition extends BaseToolDefinition {
  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      // ✅ Автоматическая генерация из schema
      inputSchema: generateDefinitionFromSchema(TransitionIssueParamsSchema, {
        includeDescriptions: true,
        includeExamples: true,
      }),
    };
  }
}
```

---

## 5. Технический подход к конверсии Zod → JSON Schema

### Используемая библиотека

**Библиотека:** `zod-to-json-schema` v3.24.6
**Статус:** ✅ Уже установлена как зависимость `@modelcontextprotocol/sdk`

```bash
npm list zod-to-json-schema
# mcp-framework-monorepo@0.0.0
# └─┬ @mcp-framework/core@0.1.0
#   └─┬ @modelcontextprotocol/sdk@1.22.0
#     └── zod-to-json-schema@3.24.6
```

### Базовая конверсия

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

const schema = z.object({
  issueKey: z.string().min(1),
  transitionId: z.string(),
  comment: z.string().optional(),
  fields: z.array(z.string()).optional(),
});

const jsonSchema = zodToJsonSchema(schema, {
  target: 'jsonSchema7',
  $refStrategy: 'none',
});

// Результат:
{
  "type": "object",
  "properties": {
    "issueKey": { "type": "string", "minLength": 1 },
    "transitionId": { "type": "string" },
    "comment": { "type": "string" },
    "fields": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["issueKey", "transitionId"],
  "additionalProperties": false
}
```

### Извлечение required полей из Zod

```typescript
import { z } from 'zod';

function extractRequiredFields<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): string[] {
  const shape = schema.shape;
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    // Проверяем, является ли поле optional
    if (!(value instanceof z.ZodOptional)) {
      required.push(key);
    }
  }

  return required;
}

// Пример
const schema = z.object({
  issueKey: z.string(),          // required
  transitionId: z.string(),      // required
  comment: z.string().optional(), // optional
});

extractRequiredFields(schema); // ['issueKey', 'transitionId']
```

### Извлечение descriptions из Zod

```typescript
function extractDescription(zodType: z.ZodTypeAny): string | undefined {
  // Проверяем наличие description
  if ('description' in zodType && typeof zodType.description === 'string') {
    return zodType.description;
  }

  // Для ZodOptional нужно развернуть до внутреннего типа
  if (zodType instanceof z.ZodOptional) {
    return extractDescription(zodType.unwrap());
  }

  return undefined;
}

// Пример
const schema = z.object({
  issueKey: z.string().describe('Ключ задачи (QUEUE-123)'),
  comment: z.string().optional().describe('Комментарий при переходе'),
});

extractDescription(schema.shape.issueKey); // 'Ключ задачи (QUEUE-123)'
extractDescription(schema.shape.comment);  // 'Комментарий при переходе'
```

### Поддержка сложных типов

#### Nested Objects

```typescript
const schema = z.object({
  issueKey: z.string(),
  customFields: z.object({
    resolution: z.string(),
    assignee: z.string().optional(),
  }).optional(),
});

// zodToJsonSchema обрабатывает автоматически:
{
  "type": "object",
  "properties": {
    "issueKey": { "type": "string" },
    "customFields": {
      "type": "object",
      "properties": {
        "resolution": { "type": "string" },
        "assignee": { "type": "string" }
      },
      "required": ["resolution"]
    }
  },
  "required": ["issueKey"]
}
```

#### Arrays

```typescript
const schema = z.object({
  fields: z.array(z.string().min(1)).min(1),
});

// Конверсия:
{
  "type": "object",
  "properties": {
    "fields": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 },
      "minItems": 1
    }
  },
  "required": ["fields"]
}
```

#### Enums

```typescript
const StatusEnum = z.enum(['open', 'in-progress', 'closed']);

const schema = z.object({
  status: StatusEnum,
});

// Конверсия:
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["open", "in-progress", "closed"]
    }
  },
  "required": ["status"]
}
```

#### z.record() (динамические ключи)

```typescript
const schema = z.object({
  customFields: z.record(z.string(), z.unknown()),
});

// Конверсия:
{
  "type": "object",
  "properties": {
    "customFields": {
      "type": "object",
      "additionalProperties": true
    }
  },
  "required": ["customFields"]
}
```

### Ограничения zod-to-json-schema

| Zod конструкция | Поддержка | Примечание |
|-----------------|-----------|------------|
| `z.string()`, `z.number()`, `z.boolean()` | ✅ Полная | Прямая конверсия |
| `z.object()`, `z.array()` | ✅ Полная | Включая вложенные |
| `z.enum()` | ✅ Полная | Конвертируется в JSON Schema enum |
| `z.union()` | ⚠️ Частичная | Конвертируется в oneOf, может быть сложным для MCP |
| `z.optional()`, `z.nullable()` | ✅ Полная | Корректно обрабатывает required/optional |
| `z.default()` | ✅ Полная | Добавляет default в JSON Schema |
| `.describe()` | ✅ Полная | Конвертируется в description |
| `z.refine()`, `z.transform()` | ❌ Нет | Кастомная валидация не переносится в JSON Schema |
| `z.lazy()`, `z.recursive()` | ⚠️ Частичная | Может потребовать $ref, не рекомендуется для MCP |

### Адаптер для MCP

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';

export function zodToMcpInputSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): ToolInputSchema {
  // 1. Конвертируем через zod-to-json-schema
  const jsonSchema = zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    $refStrategy: 'none', // Не использовать $ref для MCP
  });

  // 2. Извлекаем только нужные поля для MCP
  const { type, properties, required, additionalProperties } = jsonSchema as {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };

  // 3. Валидация результата
  if (type !== 'object') {
    throw new Error('Schema must be z.object(), got: ' + type);
  }

  return {
    type: 'object',
    properties: properties ?? {},
    ...(required && required.length > 0 && { required }),
    ...(additionalProperties !== undefined && { additionalProperties }),
  };
}
```

---

## 6. Спецификации для этапа 1.1 (Архитектурный рефакторинг)

### Задачи этапа 1.1

1. **Создать генератор definition в @mcp-framework/core**
   - `schema-to-definition.ts` - основная логика
   - `zod-json-schema-adapter.ts` - адаптер для библиотеки
   - `definition-validator.ts` - валидация соответствия
   - Экспорт через `@mcp-framework/core`

2. **Обновить BaseTool для поддержки автоматической генерации**
   - Добавить метод `getParamsSchema?(): z.ZodObject<z.ZodRawShape>`
   - Обновить `getDefinition()` для приоритета schema → definition
   - Сохранить обратную совместимость с `buildDefinition()`

3. **Создать утилиты для миграции**
   - Скрипт для проверки всех инструментов на соответствие schema ↔ definition
   - Скрипт для автоматической миграции инструментов (optional)
   - Список инструментов, требующих ручной миграции

4. **Написать тесты для генератора**
   - Unit тесты для `generateDefinitionFromSchema()`
   - Тесты для `extractRequiredFields()`
   - Тесты для `validateSchemaDefinitionMatch()`
   - Тесты для сложных типов (nested, arrays, enums, records)

### Критерии успеха этапа 1.1

- ✅ Генератор definition работает для всех типов Zod схем
- ✅ BaseTool поддерживает автоматическую генерацию
- ✅ Все тесты генератора проходят (coverage ≥90%)
- ✅ Обратная совместимость: существующие инструменты работают без изменений
- ✅ Документация API генератора написана
- ✅ `npm run validate` успешна

### Ожидаемая структура файлов после этапа 1.1

```
packages/framework/core/src/
├── definition/
│   ├── schema-to-definition.ts          # Основной генератор
│   ├── zod-json-schema-adapter.ts       # Адаптер для zod-to-json-schema
│   ├── definition-validator.ts          # Валидация соответствия
│   └── index.ts                         # Экспорты
├── tools/
│   ├── base/
│   │   └── base-tool.ts                 # ✏️ Обновлен: добавлен getParamsSchema()
│   └── ...
└── ...

packages/framework/core/tests/definition/
├── schema-to-definition.test.ts         # Тесты генератора
├── definition-validator.test.ts         # Тесты валидатора
└── fixtures/                            # Фикстуры для тестов
    ├── simple-schema.ts
    ├── complex-schema.ts
    └── nested-schema.ts
```

---

## 7. Требования для этапов 2.1-2.3 (Адаптация)

### Этап 2.1: Адаптация валидационных тестов (Parallel)

**Цель:** Добавить тесты для проверки соответствия schema ↔ definition во всех инструментах.

**Задачи:**
1. Создать helper функцию для тестирования соответствия
2. Добавить в каждый test файл инструмента новый describe блок:
   ```typescript
   describe('Schema-Definition Match', () => {
     it('должен иметь соответствие между schema и definition', () => {
       const definition = tool.getDefinition();
       const result = validateSchemaDefinitionMatch(
         ToolParamsSchema,
         definition.inputSchema
       );
       expect(result.success).toBe(true);
       expect(result.errors).toEqual([]);
     });
   });
   ```
3. Запустить тесты для всех 57 инструментов
4. Исправить найденные несоответствия (если есть)

**Критерии успеха:**
- ✅ Все 57 инструментов имеют тесты на соответствие schema ↔ definition
- ✅ Все тесты проходят успешно
- ✅ `npm run test` успешен

### Этап 2.2: Адаптация шаблонов инструментов (Parallel)

**Цель:** Обновить шаблоны создания инструментов для использования автоматической генерации.

**Задачи:**
1. Обновить template файлы (если есть)
2. Обновить документацию в `packages/servers/yandex-tracker/src/tools/README.md`
3. Добавить примеры использования `getParamsSchema()`
4. Добавить чек-лист для проверки при создании нового инструмента

**Критерии успеха:**
- ✅ Документация обновлена
- ✅ Примеры добавлены
- ✅ Чек-лист для создания инструмента включает проверку schema ↔ definition

### Этап 2.3: Обновление документации (Parallel)

**Цель:** Обновить всю документацию проекта для отражения новых паттернов.

**Разделы для обновления:**
1. **packages/framework/core/README.md**
   - Добавить секцию "Schema-based Definition Generation"
   - Добавить API документацию для `generateDefinitionFromSchema()`
   - Добавить примеры использования

2. **packages/servers/yandex-tracker/src/tools/README.md**
   - Обновить секцию "Создание нового инструмента"
   - Добавить раздел "Миграция на автоматическую генерацию definition"
   - Обновить чек-лист

3. **ARCHITECTURE.md** (корень monorepo)
   - Добавить секцию "Definition Generation Architecture"
   - Описать flow: Zod Schema → JSON Schema → MCP Definition

4. **CLAUDE.md** (корень monorepo)
   - Обновить правила для ИИ агентов при создании инструментов
   - Добавить требование: schema MUST соответствовать definition

**Критерии успеха:**
- ✅ Все указанные файлы обновлены
- ✅ `npm run validate:docs` успешна (лимиты соблюдены)
- ✅ Документация проверена на consistency

---

## 8. План миграции существующих инструментов

### Стратегия миграции

**Подход:** Постепенная миграция (incremental migration)

**Фазы:**
1. **Фаза 0 (Этап 1.1):** Создание генератора, без изменения существующих инструментов
2. **Фаза 1 (После этапа 1.1):** Миграция 5-10 инструментов как pilot
3. **Фаза 2 (Параллельно с другими задачами):** Постепенная миграция остальных инструментов
4. **Фаза 3 (Финал):** Deprecate старый подход с `buildDefinition()`

### Pilot инструменты для миграции (Фаза 1)

**Критерии выбора:**
- Разные категории инструментов
- Разная сложность schema (простые, средние, сложные)
- Уже имеют хорошее покрытие тестами

**Список pilot инструментов (5 шт):**
1. `get-issue` - простой (2 параметра: issueKey, fields)
2. `transition-issue` - средний (5 параметров: required + optional + nested)
3. `create-issue` - сложный (много параметров, customFields)
4. `get-queue-fields` - уже исправлен в de41f2c, имеет тесты
5. `add-comment` - средний (3 параметра, один optional array)

### Миграция одного инструмента

**Шаги:**
1. Убедиться, что schema покрывает все параметры
2. Добавить `getParamsSchema()` в tool class
3. Удалить `buildDefinition()` и definition class (optional)
4. Добавить тест на соответствие schema ↔ definition
5. Запустить тесты инструмента
6. Запустить полную валидацию `npm run validate`

**Пример:**

```typescript
// ДО миграции
export class TransitionIssueTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = TRANSITION_ISSUE_TOOL_METADATA;

  private readonly definition = new TransitionIssueDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, TransitionIssueParamsSchema);
    // ...
  }
}

// ПОСЛЕ миграции
export class TransitionIssueTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = TRANSITION_ISSUE_TOOL_METADATA;

  // ✅ NEW: Просто вернуть schema
  protected getParamsSchema() {
    return TransitionIssueParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, TransitionIssueParamsSchema);
    // ...
  }
}

// ✅ definition.ts и definition class можно удалить (или оставить для кастомизации)
```

### Оценка работы

| Фаза | Инструментов | Время (часы) | Статус |
|------|--------------|--------------|--------|
| Фаза 0 (Этап 1.1) | 0 (только инфраструктура) | 4-8 | Pending |
| Фаза 1 (Pilot) | 5 | 2-3 | Pending |
| Фаза 2 (Постепенная) | 52 | 10-15 | Pending |
| Фаза 3 (Cleanup) | - | 1-2 | Pending |
| **Всего** | **57** | **17-28** | - |

---

## 9. Резюме и выводы

### Ключевые находки

1. **Все 57 инструментов следуют единому паттерну**
   - ✅ Consistency высокая
   - ✅ Легко автоматизировать

2. **Баг de41f2c - не единичный случай**
   - ⚠️ 4 инструмента имели несоответствие schema ↔ definition
   - ⚠️ Потенциально могут быть еще несоответствия в других инструментах

3. **zod-to-json-schema уже установлена**
   - ✅ Не требуется установка дополнительных зависимостей
   - ✅ Поддерживает все необходимые типы Zod

4. **BaseTool хорошо подходит для интеграции**
   - ✅ Можно добавить `getParamsSchema()` без breaking changes
   - ✅ Обратная совместимость сохранится

### Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Сложные Zod типы не конвертируются корректно | Средняя | Высокое | Тщательное тестирование, fallback на ручную definition |
| Миграция 57 инструментов займет много времени | Высокая | Среднее | Постепенная миграция, приоритет на pilot инструменты |
| Breaking changes для существующих инструментов | Низкая | Высокое | Сохранить обратную совместимость через optional `getParamsSchema()` |
| Недостаточное покрытие тестами после миграции | Средняя | Среднее | Добавить обязательные тесты на соответствие в этапе 2.1 |

### Рекомендации

1. **Приоритет на этап 1.1**
   - Создание инфраструктуры критично для предотвращения будущих багов
   - Оценка времени: 4-8 часов

2. **Pilot миграция (5 инструментов)**
   - Проверить подход на практике
   - Выявить edge cases
   - Оценка времени: 2-3 часа

3. **Постепенная миграция остальных инструментов**
   - Не блокирует другие задачи
   - Можно выполнять параллельно
   - Оценка времени: 10-15 часов (можно растянуть на несколько спринтов)

4. **Обязательные тесты на соответствие**
   - Добавить в template инструмента
   - Добавить в CI/CD pipeline
   - Предотвращает рецидивы бага

### Следующие шаги

1. ✅ **Этап 0.1 завершен** - создан ANALYSIS_RESULTS.md
2. ⏭️ **Этап 1.1** (Sequential) - архитектурный рефакторинг (4-8 часов)
3. ⏭️ **Этапы 2.1-2.3** (Parallel) - адаптация тестов, шаблонов, документации

---

**Дата завершения анализа:** 2025-11-20
**Автор:** Claude Code AI Agent
**Статус:** ✅ Готов к переходу на этап 1.1
