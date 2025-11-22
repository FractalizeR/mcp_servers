# Migration Guide — MCP Framework & Yandex Tracker

**Руководство по миграции между версиями**

---

## v1.x → v2.0.0: Infrastructure cleanup (Breaking Changes)

### BREAKING: Удалён config из `@mcp-framework/infrastructure`

**Причина:** Infrastructure слой должен быть domain-agnostic. Конфигурация Yandex Tracker переехала в соответствующий пакет.

#### ServerConfig, loadConfig, константы

**ДО (v1.x):**
```typescript
import { ServerConfig, loadConfig } from '@mcp-framework/infrastructure';
import { DEFAULT_API_BASE, ENV_VAR_NAMES } from '@mcp-framework/infrastructure';
```

**ПОСЛЕ (v2.0.0):**
```typescript
// Из yandex-tracker пакета:
import { ServerConfig, loadConfig } from '@mcp-server/yandex-tracker/config';
// или с использованием alias (внутри yandex-tracker):
import { ServerConfig, loadConfig } from '#config';
```

#### ParsedCategoryFilter

**ДО (v1.x):**
```typescript
import { ParsedCategoryFilter } from '@mcp-framework/infrastructure';
```

**ПОСЛЕ (v2.0.0):**
```typescript
// Переехал в @mcp-framework/core (универсальный тип для tool filtering):
import { ParsedCategoryFilter } from '@mcp-framework/core';
```

#### LogLevel (НЕ изменился)

```typescript
// LogLevel остался в infrastructure (универсальный тип для logging):
import { LogLevel } from '@mcp-framework/infrastructure';
```

### Затронутые файлы

- `packages/framework/infrastructure/src/config.ts` — удалён
- `packages/framework/infrastructure/src/constants.ts` — удалён
- `packages/framework/infrastructure/src/types.ts` — удалены ServerConfig, ParsedCategoryFilter
- `packages/framework/core/src/tool-registry/types.ts` — добавлен ParsedCategoryFilter

### Миграция для разработчиков framework

Если вы разрабатываете собственный MCP server на базе framework:

1. Замените импорты config/constants на свои локальные
2. ParsedCategoryFilter теперь в `@mcp-framework/core`
3. LogLevel остался в `@mcp-framework/infrastructure`

---

### BREAKING: CacheManager теперь асинхронный

**Причина:** Подготовка к поддержке внешних кешей (Redis, Memcached). In-memory кеш не может использовать асинхронный интерфейс для совместимости с внешними кешами.

#### Интерфейс CacheManager

**ДО (v1.x):**
```typescript
interface CacheManager {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  prune(): void;
}
```

**ПОСЛЕ (v2.0.0):**
```typescript
interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  prune(): Promise<void>;
}
```

#### Использование кеша

**ДО (v1.x):**
```typescript
const value = cacheManager.get<Issue>('issue:123');
cacheManager.set('issue:123', issue);
cacheManager.delete('issue:123');
```

**ПОСЛЕ (v2.0.0):**
```typescript
const value = await cacheManager.get<Issue>('issue:123');
await cacheManager.set('issue:123', issue);
await cacheManager.delete('issue:123');
```

#### Новые реализации

**ДО (v1.x):**
- `NoOpCache` — единственная реализация (синхронная)

**ПОСЛЕ (v2.0.0):**
- `NoOpCache` — обновлён до async (возвращает `null` вместо `undefined`)
- `InMemoryCacheManager` — новая реализация с async интерфейсом, TTL поддержкой

#### Возвращаемые значения

- `get()` теперь возвращает `null` (вместо `undefined`) при cache miss
- Проверяйте `if (cached !== null)` вместо `if (cached !== undefined)`

#### Миграция кода

1. Добавьте `await` ко всем вызовам методов CacheManager
2. Замените `undefined` на `null` в проверках кеша
3. Убедитесь, что функции с вызовами кеша помечены как `async`

**Пример миграции:**
```typescript
// ДО
protected getCached<T>(key: string): T | undefined {
  return this.cacheManager.get<T>(key);
}

// ПОСЛЕ
protected async getCached<T>(key: string): Promise<T | null> {
  return await this.cacheManager.get<T>(key);
}
```

#### Использование в DI контейнере

**ДО (v1.x):**
```typescript
container.bind<CacheManager>(TYPES.CacheManager).to(NoOpCache);
```

**ПОСЛЕ (v2.0.0):**
```typescript
// Рекомендуется InMemoryCacheManager для production
const cacheManager = new InMemoryCacheManager(300000); // 5 минут TTL
container.bind<CacheManager>(TYPES.CacheManager).toConstantValue(cacheManager);

// Или NoOpCache для отключения кеша
container.bind<CacheManager>(TYPES.CacheManager).to(NoOpCache);
```

---

## v2.x → v2.y: Обязательный параметр `fields`

### Breaking Change

Все MCP tools теперь требуют обязательный параметр `fields: string[]`.

**ДО:**
```typescript
await client.callTool('get_projects', { perPage: 10 });
```

**ПОСЛЕ:**
```typescript
await client.callTool('get_projects', {
  perPage: 10,
  fields: ['id', 'name', 'description']  // ← обязательно
});
```

### Затронутые tools (26)

- **Checklists:** `add_checklist_item`, `get_checklist`, `update_checklist_item`
- **Comments:** `add_comment`, `edit_comment`, `get_comments`
- **Components:** `create_component`, `get_components`, `update_component`
- **Attachments:** `get_attachments`, `upload_attachment`
- **Links:** `create_link`, `get_issue_links`
- **Projects:** `create_project`, `get_project`, `get_projects`, `update_project`
- **Queues:** `create_queue`, `get_queue`, `get_queues`, `get_queue_fields`, `manage_queue_access`, `update_queue`
- **Worklogs:** `add_worklog`, `get_worklogs`, `update_worklog`

### Миграция

1. Добавьте параметр `fields` во все вызовы перечисленных tools
2. Укажите минимальный набор нужных полей для экономии контекста
3. Используйте вложенные поля: `['assignee.login', 'status.key']`

### Преимущества

- Экономия контекста Claude на 80-90%
- Быстрее обработка ответов
- Явное управление возвращаемыми данными

---

## См. также

- **Корневой CLAUDE.md:** [CLAUDE.md](./CLAUDE.md)
- **Yandex Tracker README:** [packages/servers/yandex-tracker/README.md](packages/servers/yandex-tracker/README.md)
- **Архитектура:** [ARCHITECTURE.md](./ARCHITECTURE.md)
