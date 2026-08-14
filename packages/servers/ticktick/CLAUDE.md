# CLAUDE.md — TickTick MCP Server

Инструкции для ИИ агентов при работе с пакетом `@fractalizer/mcp-server-ticktick`.

---

## 📖 Перед началом работы

1. Прочитай корневой [CLAUDE.md](../../../CLAUDE.md) — правила monorepo
2. Прочитай [ARCHITECTURE.md](../../../ARCHITECTURE.md) — архитектура фреймворка
3. Ознакомься с [README.md](./README.md) — обзор пакета

---

## 🚨 Критические правила

### Граф зависимостей

```
infrastructure (база)
    ↓
core (BaseTool, types)
    ↓
ticktick (этот пакет)
```

**❌ НЕЛЬЗЯ** импортировать из ticktick в framework пакеты.

### Импорты

**Между пакетами:**
```typescript
import { BaseTool } from '@fractalizer/mcp-core';
import { HttpClient } from '@fractalizer/mcp-infrastructure';
```

**Внутри пакета (subpath imports):**
```typescript
import { TickTickFacade } from '#ticktick_api/facade/index.js';
import { GetTaskOperation } from '#ticktick_api/api_operations/tasks/index.js';
import { MCP_TOOL_PREFIX } from '#constants';
```

**❌ НЕ используй:**
```typescript
import { Task } from '../../../ticktick_api/entities/task.js'; // WRONG!
```

---

## 📁 Структура пакета

```
src/
├── composition-root/        # DI контейнер (InversifyJS)
│   ├── container.ts        # Создание и конфигурация контейнера
│   ├── types.ts            # Symbol токены для DI
│   └── definitions/        # Списки operations и tools
├── config/                  # Конфигурация
│   ├── config-loader.ts
│   └── server-config.interface.ts
├── ticktick_api/           # API слой
│   ├── api_operations/     # HTTP операции
│   │   ├── projects/
│   │   └── tasks/
│   ├── auth/              # OAuth 2.0
│   ├── dto/               # Data Transfer Objects
│   ├── entities/          # Task, Project
│   ├── facade/            # TickTickFacade
│   └── http/              # AuthenticatedHttpClient
└── tools/                  # MCP Tools
    ├── api/
    │   ├── date-queries/  # 5 tools
    │   └── projects/      # 6 tools
    ├── helpers/           # ping, GTD (3 tools)
    └── tasks/             # 10 tools
```

---

## 🔧 Добавление нового Tool

### 1. Создай файлы

```
src/tools/{category}/{action}/
├── {name}.schema.ts       # Zod schema
├── {name}.metadata.ts     # ToolMetadata
├── {name}.tool.ts         # Класс tool
└── index.ts               # Экспорт
```

### 2. Schema (Zod)

```typescript
// get-something.schema.ts
import { z } from 'zod';
import { FieldsSchema } from '@fractalizer/mcp-core';

export const GetSomethingParamsSchema = z.object({
  id: z.string().min(1).describe('ID ресурса'),
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetSomethingParams = z.infer<typeof GetSomethingParamsSchema>;
```

### 3. Metadata

```typescript
// get-something.metadata.ts
import type { ToolMetadata } from '@fractalizer/mcp-core';

export const GET_SOMETHING_TOOL_METADATA: ToolMetadata = {
  name: 'get_something',
  description: '[Category/Subcategory] Описание инструмента',
  category: 'tasks',           // tasks | projects | helpers
  subcategory: 'read',         // read | write | date | gtd
  priority: 'high',            // critical | high | normal | low
  tags: ['something', 'get'],
};
```

### 4. Tool class

```typescript
// get-something.tool.ts
import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import { GetSomethingParamsSchema } from './get-something.schema.js';
import { GET_SOMETHING_TOOL_METADATA } from './get-something.metadata.js';

export class GetSomethingTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_SOMETHING_TOOL_METADATA;

  protected override getParamsSchema() {
    return GetSomethingParamsSchema;
  }

  async execute(params: unknown) {
    const validation = this.validateParams(params, GetSomethingParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { id, fields } = validation.data;

    try {
      const data = await this.facade.getSomething(id);
      const filtered = ResponseFieldFilter.filter(data, fields);

      return this.formatSuccess({
        data: filtered,
        fieldsReturned: fields,
      });
    } catch (error) {
      return this.formatError('Failed to get something', error);
    }
  }
}
```

### 5. Зарегистрируй в tool-definitions.ts

```typescript
// src/composition-root/definitions/tool-definitions.ts
import { GetSomethingTool } from '#tools/api/something/get-something.tool.js';

export const TOOL_CLASSES = [
  // ... existing tools
  GetSomethingTool,
] as const;
```

### 6. Валидация

```bash
npm run validate:quiet --workspace=@fractalizer/mcp-server-ticktick
```

---

## 🎯 Категоризация Tools

| Category | Subcategory | Описание |
|----------|-------------|----------|
| `projects` | `read` | Чтение проектов |
| `projects` | `write` | Изменение проектов |
| `tasks` | `read` | Чтение задач |
| `tasks` | `write` | Изменение задач |
| `tasks` | `date` | Запросы по датам |
| `helpers` | — | ping |
| `helpers` | `gtd` | GTD-методологии |

---

## 📝 Обязательные параметры

Все **read**-операции должны принимать параметр `fields`:

```typescript
fields: FieldsSchema.describe('Поля для возврата')
```

И применять `ResponseFieldFilter.filter(data, fields)`.

---

## 🧪 Тестирование

```bash
# Unit тесты
npm run test --workspace=@fractalizer/mcp-server-ticktick

# С coverage
npm run test:coverage --workspace=@fractalizer/mcp-server-ticktick

# Quiet mode (для ИИ)
npm run test:quiet --workspace=@fractalizer/mcp-server-ticktick
```

---

## 📋 Чек-лист перед коммитом

- [ ] `npm run validate:quiet` проходит
- [ ] Новые tools зарегистрированы в `tool-definitions.ts`
- [ ] Metadata содержит category, subcategory, priority, tags
- [ ] Read-операции используют `fields` + `ResponseFieldFilter`
- [ ] Код следует SRP (один файл = одна ответственность)

---

## 🔗 Ссылки

- [TickTick API (Pipedream)](https://pipedream.com/apps/ticktick)
- [BaseTool API](../../framework/core/README.md)
- [Infrastructure](../../framework/infrastructure/README.md)
