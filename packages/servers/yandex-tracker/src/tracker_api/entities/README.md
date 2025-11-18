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
├── common/                  # Общие типы (v2.0+)
│   ├── pagination.entity.ts # PaginationParams, PaginatedResponse
│   ├── user-ref.entity.ts   # UserRef (облегченная версия User)
│   ├── timestamp.entity.ts  # TimestampFields (createdAt, updatedAt)
│   └── index.ts             # Экспорты common types
├── issue.entity.ts          # Issue + IssueWithUnknownFields
├── user.entity.ts           # User + UserWithUnknownFields
├── types.ts                 # WithUnknownFields helper
└── index.ts                 # Экспорты

```

---

## 🔧 Общие типы (Common Types, v2.0+)

### UserRef — Референс на пользователя

Облегченная версия `User` для ссылок в других объектах:
```typescript
interface UserRef {
  readonly self: string;    // URL в API
  readonly id: string;      // ID пользователя
  readonly display: string; // Отображаемое имя
}
```

**Используй вместо `User`:**
- `Comment.createdBy` — автор комментария
- `Attachment.createdBy` — кто прикрепил файл
- `Worklog.createdBy` — кто записал время

### PaginationParams — Параметры пагинации

```typescript
interface PaginationParams {
  readonly perPage?: number; // Элементов на странице
  readonly page?: number;    // Номер страницы
}
```

### PaginatedResponse<T> — Ответ с пагинацией

```typescript
interface PaginatedResponse<T> {
  readonly items: T[];       // Элементы текущей страницы
  readonly total: number;    // Общее количество
  readonly page: number;     // Текущая страница
  readonly perPage: number;  // Элементов на странице
}
```

### TimestampFields — Поля дат

```typescript
interface TimestampFields {
  readonly createdAt: string;  // ISO 8601
  readonly updatedAt: string;  // ISO 8601
}
```

**Используй через composition:**
```typescript
interface Comment extends TimestampFields {
  readonly id: string;
  readonly text: string;
  // createdAt и updatedAt наследуются
}
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

### Entity для файловых вложений

**Файл:** `src/tracker_api/entities/attachment.entity.ts`

```typescript
import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';

/**
 * Прикрепленный файл (вложение) в Яндекс.Трекере
 *
 * Представляет файл, прикрепленный к задаче.
 * Может быть изображением, документом или любым другим типом файла.
 */
export interface Attachment {
  /** Уникальный идентификатор файла (всегда присутствует) */
  readonly id: string;

  /** URL ресурса для self-reference (всегда присутствует) */
  readonly self: string;

  /** Имя файла (всегда присутствует) */
  readonly name: string;

  /** URL для скачивания файла (всегда присутствует) */
  readonly content: string;

  /** URL миниатюры изображения (присутствует только для изображений) */
  readonly thumbnail?: string;

  /** Автор загрузки файла (всегда присутствует) */
  readonly createdBy: UserRef;

  /** Дата создания (ISO 8601) (всегда присутствует) */
  readonly createdAt: string;

  /** MIME тип файла (всегда присутствует) */
  readonly mimetype: string;

  /** Размер файла в байтах (всегда присутствует) */
  readonly size: number;
}

export type AttachmentWithUnknownFields = WithUnknownFields<Attachment>;
```

**Особенности:**
- Использует `UserRef` вместо полного `User` для оптимизации
- Опциональное поле `thumbnail` присутствует только для изображений
- Поле `content` содержит URL для скачивания, а не само содержимое файла
- Поле `size` указывает размер в байтах для валидации перед скачиванием

### Entity для комментариев

**Файл:** `src/tracker_api/entities/comment/comment.entity.ts`

```typescript
import type { WithUnknownFields } from '../types.js';
import type { UserRef } from '../common/user-ref.entity.js';

/**
 * Вложение в комментарии
 */
export interface CommentAttachment {
  /** Идентификатор вложения */
  readonly id: string;

  /** Имя файла */
  readonly name: string;

  /** Размер файла в байтах */
  readonly size: number;
}

/**
 * Комментарий к задаче
 */
export interface Comment {
  /** Идентификатор комментария (всегда присутствует) */
  readonly id: string;

  /** URL ссылка на комментарий в API (всегда присутствует) */
  readonly self: string;

  /** Текст комментария (всегда присутствует) */
  readonly text: string;

  /** Автор комментария (всегда присутствует) */
  readonly createdBy: UserRef;

  /** Дата создания комментария в формате ISO 8601 (всегда присутствует) */
  readonly createdAt: string;

  /** Пользователь, который последним изменил комментарий */
  readonly updatedBy?: UserRef;

  /** Дата последнего изменения в формате ISO 8601 */
  readonly updatedAt?: string;

  /** Версия комментария (для оптимистичной блокировки) */
  readonly version?: number;

  /** Способ доставки комментария */
  readonly transport?: 'internal' | 'email';

  /** Вложения в комментарии */
  readonly attachments?: readonly CommentAttachment[];
}

export type CommentWithUnknownFields = WithUnknownFields<Comment>;
```

**Особенности:**
- Использует `UserRef` для автора и редактора комментария
- Поддерживает вложения через `CommentAttachment`
- Поле `transport` указывает способ доставки: 'internal' (через UI) или 'email'
- Поле `version` используется для контроля конкурентных изменений
- Опциональные поля `updatedBy` и `updatedAt` присутствуют только для отредактированных комментариев

---

## 🔗 См. также

- **Operations:** [src/tracker_api/api_operations/CONVENTIONS.md](../api_operations/CONVENTIONS.md)
- **DTO:** [src/tracker_api/dto/CONVENTIONS.md](../dto/CONVENTIONS.md)
- **Общие правила:** [CLAUDE.md](../../../CLAUDE.md)
