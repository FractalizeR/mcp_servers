# Entities — Конвенции разработки

**Перед созданием новой Entity ОБЯЗАТЕЛЬНО прочитай этот файл.**

---

## 🎯 Назначение Entities

**Entity** — типизированное представление объекта из API Яндекс.Трекера:
- Содержит **только известные поля** (из документации API)
- Используется для type-safety и IDE autocomplete
- Комбинируется с `WithUnknownFields<T>` для поддержки кастомных полей

---

## 📁 Структура

```
src/tracker_api/entities/
├── issue.entity.ts      # Issue + IssueWithUnknownFields
├── user.entity.ts       # User + UserWithUnknownFields
├── types.ts             # WithUnknownFields helper
└── index.ts             # Экспорты
```

---

## 🏗️ Шаблон Entity

```typescript
/**
 * Задача в Яндекс.Трекере (только известные поля из API v3)
 */
export interface Issue {
  /** Идентификатор задачи (всегда присутствует) */
  readonly id: string;

  /** Уникальный ключ задачи (QUEUE-123) (всегда присутствует) */
  readonly key: string;

  /** Краткое описание */
  readonly summary: string;

  /** Очередь задачи */
  readonly queue: Queue;

  /** Текущий статус */
  readonly status: Status;

  /** Автор задачи */
  readonly createdBy: User;

  /** Дата создания (ISO 8601) */
  readonly createdAt: string;

  /** Дата последнего обновления (ISO 8601) */
  readonly updatedAt: string;

  // ... другие known поля
}

/**
 * Issue с поддержкой unknown полей (кастомные поля)
 *
 * Используй этот тип для:
 * - Возвращаемых значений из Operations
 * - Данных от API, которые могут содержать кастомные поля
 */
export type IssueWithUnknownFields = WithUnknownFields<Issue>;
```

---

## 🔧 WithUnknownFields — Helper для unknown полей

**Определение** (`types.ts`):
```typescript
/**
 * Добавляет поддержку unknown полей к типу
 * Используется для entities, которые могут иметь кастомные поля из API
 */
export type WithUnknownFields<T> = T & {
  [key: string]: unknown;
};
```

**Зачем:**
- API Яндекс.Трекер возвращает кастомные поля (не описанные в документации)
- TypeScript должен знать, что объект может иметь дополнительные свойства
- Позволяет безопасно работать с данными через `ResponseFieldFilter`

---

## 📋 Чек-лист создания Entity

- [ ] Создать файл `src/tracker_api/entities/{name}.entity.ts`
- [ ] **Определить интерфейс:**
  - [ ] **Добавить обязательное поле `id` первым полем**
  - [ ] Только **known поля** из документации API
  - [ ] JSDoc комментарии для каждого поля
  - [ ] **Использовать модификатор `readonly` для всех полей**
  - [ ] Использовать существующие entities для связей (User, Queue, Status)
  - [ ] Даты в формате string (ISO 8601)
- [ ] **Создать WithUnknownFields тип:**
  ```typescript
  export type IssueWithUnknownFields = WithUnknownFields<Issue>;
  ```
- [ ] **Экспорт:**
  - [ ] Добавить в `entities/index.ts`:
    ```typescript
    export type { Issue, IssueWithUnknownFields } from './issue.entity.js';
    ```
- [ ] **Тесты (если есть бизнес-логика):**
  - [ ] Обычно entities — просто типы, тесты не нужны
  - [ ] Если есть методы/утилиты — написать тесты
- [ ] `npm run validate` — проходит (typecheck)

---

## 🚨 Критические правила

### 1. Только known поля

✅ **Правильно:**
```typescript
export interface Issue {
  readonly id: string;
  readonly key: string;
  readonly summary: string;
  readonly status: Status;
  // Только известные поля из API
}
```

❌ **Неправильно:**
```typescript
export interface Issue {
  key: string;
  summary: string;
  [key: string]: unknown; // НЕ добавляй index signature в базовый тип!
}
```

**⚠️ Index signature добавляется через `WithUnknownFields<T>`**

---

### 2. Всегда создавай WithUnknownFields тип

✅ **Правильно:**
```typescript
export interface Issue { ... }
export type IssueWithUnknownFields = WithUnknownFields<Issue>;
```

❌ **Неправильно:**
```typescript
export interface Issue { ... }
// Забыли WithUnknownFields — Operations не смогут вернуть данные с кастомными полями
```

---

### 3. Все поля должны быть readonly

✅ **Правильно:**
```typescript
export interface Issue {
  readonly id: string;
  readonly key: string;
  readonly summary: string;
}
```

❌ **Неправильно:**
```typescript
export interface Issue {
  id: string;      // ❌ Не readonly
  key: string;     // ❌ Не readonly
}
```

**Почему:** Entities — immutable типы данных из API, изменение полей не имеет смысла.

---

### 4. Используй WithUnknownFields для API данных

✅ **Правильно (в Operations):**
```typescript
async execute(): Promise<IssueWithUnknownFields> {
  return this.httpClient.get<Issue>('/v3/issues/...');
}
```

❌ **Неправильно:**
```typescript
async execute(): Promise<Issue> { ... } // Теряем unknown поля
```

---

### 5. Вложенные entities

Для связанных объектов используй существующие entities:

✅ **Правильно:**
```typescript
export interface Issue {
  assignee?: User;          // Переиспользуем User
  queue: Queue;             // Переиспользуем Queue
  status: Status;           // Переиспользуем Status
}
```

❌ **Неправильно:**
```typescript
export interface Issue {
  assignee?: {              // Дублируем определение User
    login: string;
    display: string;
  };
}
```

---

## 📚 Примеры

### Простая Entity

**Файл:** `src/tracker_api/entities/status.entity.ts`

```typescript
/**
 * Статус задачи в Яндекс.Трекере
 */
export interface Status {
  /** Идентификатор статуса (всегда присутствует) */
  readonly id: string;

  /** Уникальный ключ статуса */
  readonly key: string;

  /** Отображаемое название */
  readonly display: string;
}

export type StatusWithUnknownFields = WithUnknownFields<Status>;
```

### Entity с вложенными объектами

**Файл:** `src/tracker_api/entities/issue.entity.ts`

```typescript
import type { WithUnknownFields } from './types.js';
import type { User } from './user.entity.js';
import type { Queue } from './queue.entity.js';
import type { Status } from './status.entity.js';
import type { Priority } from './priority.entity.js';
import type { IssueType } from './issue-type.entity.js';

export interface Issue {
  /** Идентификатор задачи (всегда присутствует) */
  readonly id: string;

  /** Уникальный ключ задачи (QUEUE-123) (всегда присутствует) */
  readonly key: string;

  /** Краткое описание */
  readonly summary: string;

  // Вложенные entities
  /** Очередь задачи */
  readonly queue: Queue;

  /** Текущий статус */
  readonly status: Status;

  /** Автор задачи */
  readonly createdBy: User;

  /** Исполнитель задачи */
  readonly assignee?: User;

  // Даты
  /** Дата создания (ISO 8601) */
  readonly createdAt: string;

  /** Дата последнего обновления (ISO 8601) */
  readonly updatedAt: string;
}

export type IssueWithUnknownFields = WithUnknownFields<Issue>;
```

---

## 🔗 См. также

- **Operations:** [src/tracker_api/api_operations/CONVENTIONS.md](../api_operations/CONVENTIONS.md)
- **DTO:** [src/tracker_api/dto/CONVENTIONS.md](../dto/CONVENTIONS.md)
- **Общие правила:** [CLAUDE.md](../../../CLAUDE.md)
