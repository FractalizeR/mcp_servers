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

Использует вложенные entities (`Queue`, `Status`, `User`) для связанных объектов.
См. полный код в файле выше.

### Entity для файловых вложений

**Файл:** `src/tracker_api/entities/attachment.entity.ts`

- Использует `UserRef` для оптимизации
- Поле `content` — URL скачивания, `thumbnail` — опциональная миниатюра
- Поля `size` и `mimetype` для метаданных

### Entity для комментариев

**Файл:** `src/tracker_api/entities/comment/comment.entity.ts`

- Использует `UserRef` для авторов, поддерживает вложения
- Поле `version` для оптимистичных блокировок
- Поле `transport` определяет способ доставки: 'internal' или 'email'

### Entity для очередей

**Файл:** `src/tracker_api/entities/queue.entity.ts`

Основная entity для работы с очередями:

```typescript
export interface Queue {
  readonly id: string;           // ID очереди
  readonly key: string;          // Ключ очереди (A-Z, 2-10 символов)
  readonly name: string;         // Название очереди
  readonly lead: UserRef;        // Руководитель очереди
  readonly version: number;      // Версия для optimistic locking
  readonly assignAuto?: boolean; // Автоназначение исполнителей
  // ... другие поля
}

export type QueueWithUnknownFields = WithUnknownFields<Queue>;
```

**Ключевые особенности:**
- `version` — используется для оптимистичных блокировок при обновлении
- `assignAuto` — контролирует автоназначение исполнителей
- `lead` — тип `UserRef` (не полный `User`)

### Entity для полей очереди

**Файл:** `src/tracker_api/entities/queue-field.entity.ts`

Описывает настраиваемые поля очереди:

```typescript
export interface QueueField {
  readonly id: string;
  readonly name: string;
  readonly key: string;
  readonly type: string;         // string, user, date, number, select, array
  readonly required?: boolean;   // Обязательность при создании задач
  // ... другие поля
}

export type QueueFieldWithUnknownFields = WithUnknownFields<QueueField>;
```

**Поддерживаемые типы полей:** `string`, `user`, `date`, `number`, `select`, `array`

### Entity для прав доступа

**Файл:** `src/tracker_api/entities/queue-permission.entity.ts`

Описывает права доступа к очереди:

```typescript
export interface QueuePermission {
  readonly role: QueueRole;      // Роль пользователя
  readonly users?: UserRef[];    // Пользователи с этой ролью
  readonly groups?: string[];    // Группы с этой ролью
}

export type QueueRole = 'queue-lead' | 'team-member' | 'follower' | 'access';
export type QueuePermissionWithUnknownFields = WithUnknownFields<QueuePermission>;
```

**Роли очереди:**
- `queue-lead` — руководитель очереди (полные права)
- `team-member` — член команды (создание/редактирование задач)
- `follower` — наблюдатель (только чтение)
- `access` — базовый доступ к очереди

### Entity для компонентов

**Файл:** `src/tracker_api/entities/component.entity.ts`

Описывает компоненты очереди для группировки задач:

```typescript
export interface Component {
  readonly id: string;           // ID компонента
  readonly self: string;         // URL в API
  readonly name: string;         // Название компонента
  readonly queue: QueueRef;      // Очередь компонента
  readonly assignAuto: boolean;  // Автоназначение исполнителя
  readonly description?: string; // Описание (опционально)
  readonly lead?: UserRef;       // Ответственный (опционально)
}

export type ComponentWithUnknownFields = WithUnknownFields<Component>;
```

**Ключевые особенности:**
- `queue` — тип `QueueRef` (референс на очередь)
- `assignAuto` — автоназначение исполнителя при добавлении компонента
- `lead` — опциональный ответственный за компонент

---

## 🔗 См. также

- **Operations:** [src/tracker_api/api_operations/CONVENTIONS.md](../api_operations/CONVENTIONS.md)
- **DTO:** [src/tracker_api/dto/CONVENTIONS.md](../dto/CONVENTIONS.md)
- **Общие правила:** [CLAUDE.md](../../../CLAUDE.md)
