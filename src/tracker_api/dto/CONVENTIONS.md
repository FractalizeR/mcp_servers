# DTO (Data Transfer Objects) — Конвенции разработки

**Перед созданием нового DTO ОБЯЗАТЕЛЬНО прочитай этот файл.**

---

## 🎯 Назначение DTO

**DTO** — объект для передачи данных между слоями приложения:
- **Input DTO:** параметры для Operations (создание/обновление через API)
- **Output:** используем Entities с `WithUnknownFields<T>` (не DTO!)

**Основное отличие от Entity:**
- Entity = данные **ИЗ** API (read)
- DTO = данные **В** API (write)

---

## 📁 Структура

```
src/tracker_api/dto/{feature}/
├── create-{entity}.dto.ts      # Для создания
├── update-{entity}.dto.ts      # Для обновления
└── index.ts                    # Экспорты
```

**Примеры:**
```
src/tracker_api/dto/issue/
├── create-issue.dto.ts
├── update-issue.dto.ts
└── index.ts
```

---

## 🏗️ Шаблон DTO

### Input DTO (создание)

```typescript
/**
 * Параметры для создания задачи
 */
export interface CreateIssueDto {
  /** Очередь (обязательно) */
  queue: string;

  /** Название задачи (обязательно) */
  summary: string;

  /** Описание (опционально) */
  description?: string;

  /** Тип задачи (опционально) */
  type?: string;

  /** Приоритет (опционально) */
  priority?: string;

  /** Исполнитель (login пользователя) */
  assignee?: string;

  /**
   * Кастомные поля (опционально)
   * Пример: { customField123: 'value', deadline: '2024-12-31' }
   */
  [key: string]: unknown;
}
```

### Input DTO (обновление)

```typescript
/**
 * Параметры для обновления задачи
 * Все поля опциональны (partial update)
 */
export interface UpdateIssueDto {
  /** Название задачи */
  summary?: string;

  /** Описание */
  description?: string;

  /** Статус (ключ статуса) */
  status?: string;

  /** Исполнитель (login пользователя) */
  assignee?: string;

  /**
   * Кастомные поля
   */
  [key: string]: unknown;
}
```

---

## 📋 Чек-лист создания DTO

- [ ] Создать файл `src/tracker_api/dto/{feature}/{action}-{entity}.dto.ts`
- [ ] **Определить интерфейс:**
  - [ ] Только поля, которые API принимает
  - [ ] Обязательные поля — без `?`
  - [ ] Опциональные поля — с `?`
  - [ ] Для create: обязательные поля из API
  - [ ] Для update: все поля опциональны (partial)
  - [ ] JSDoc комментарии для неочевидных полей
- [ ] **Для Input DTO:**
  - [ ] Добавить `[key: string]: unknown` для кастомных полей
- [ ] **Экспорт:**
  - [ ] Добавить в `dto/{feature}/index.ts`
  - [ ] Реэкспортировать в `dto/index.ts`
- [ ] **Использование в Operations:**
  ```typescript
  async execute(params: CreateIssueDto): Promise<IssueWithUnknownFields> {
    return this.httpClient.post<Issue>('/v3/issues', params);
  }
  ```
- [ ] **Тесты:**
  - [ ] Обычно DTO — просто типы, тесты не нужны
  - [ ] Если есть валидация/трансформация — написать тесты
- [ ] `npm run validate` — проходит

---

## 🚨 Критические правила

### 1. DTO для Input, Entity для Output

✅ **Правильно:**
```typescript
// Operation принимает DTO
async createIssue(params: CreateIssueDto): Promise<IssueWithUnknownFields> {
  return this.httpClient.post<Issue>('/v3/issues', params);
}

// Operation возвращает Entity с unknown полями
```

❌ **Неправильно:**
```typescript
// НЕ используй Entity для input
async createIssue(params: Issue): Promise<Issue> { ... }
```

---

### 2. Кастомные поля через index signature

Для Input DTO (где API принимает кастомные поля):

✅ **Правильно:**
```typescript
export interface CreateIssueDto {
  queue: string;
  summary: string;
  [key: string]: unknown; // Кастомные поля
}
```

❌ **Неправильно:**
```typescript
export interface CreateIssueDto {
  queue: string;
  summary: string;
  customFields?: Record<string, unknown>; // Излишняя вложенность
}
```

---

### 3. Partial для Update DTO

Update операции обычно поддерживают partial update:

✅ **Правильно:**
```typescript
export interface UpdateIssueDto {
  summary?: string;     // Все поля опциональны
  description?: string;
  status?: string;
  [key: string]: unknown;
}
```

❌ **Неправильно:**
```typescript
export interface UpdateIssueDto {
  summary: string;      // Обязательные поля для update — неправильно
  description: string;
}
```

---

### 4. Примитивные типы для связей

В DTO используй примитивы (ключи, login), а не вложенные объекты:

✅ **Правильно:**
```typescript
export interface CreateIssueDto {
  queue: string;           // Ключ очереди
  assignee?: string;       // Login пользователя
  parent?: string;         // Ключ родительской задачи
}
```

❌ **Неправильно:**
```typescript
export interface CreateIssueDto {
  queue: Queue;            // Вложенный объект — API не примет
  assignee?: User;
}
```

---

## 📚 Примеры

### Create DTO

**Файл:** `src/tracker_api/dto/issue/create-issue.dto.ts`

```typescript
/**
 * Параметры для создания задачи через API v3
 *
 * Документация: https://cloud.yandex.ru/docs/tracker/concepts/issues/create-issue
 */
export interface CreateIssueDto {
  /** Ключ очереди (обязательно) */
  queue: string;

  /** Название задачи (обязательно) */
  summary: string;

  /** Описание (markdown) */
  description?: string;

  /** Тип задачи (ключ типа) */
  type?: string;

  /** Приоритет (ключ приоритета) */
  priority?: string;

  /** Исполнитель (login пользователя) */
  assignee?: string;

  /** Родительская задача (ключ задачи) */
  parent?: string;

  /** Спринт (ID спринта) */
  sprint?: string[];

  /** Кастомные поля */
  [key: string]: unknown;
}
```

### Update DTO

**Файл:** `src/tracker_api/dto/issue/update-issue.dto.ts`

```typescript
/**
 * Параметры для обновления задачи через API v3
 *
 * Все поля опциональны (partial update)
 *
 * Документация: https://cloud.yandex.ru/docs/tracker/concepts/issues/patch-issue
 */
export interface UpdateIssueDTO {
  summary?: string;
  description?: string;
  status?: string;
  type?: string;
  priority?: string;
  assignee?: string;
  sprint?: string[];

  /** Кастомные поля */
  [key: string]: unknown;
}
```

---

## 🔗 См. также

- **Entities:** [src/tracker_api/entities/CONVENTIONS.md](../entities/CONVENTIONS.md)
- **Operations:** [src/tracker_api/api_operations/CONVENTIONS.md](../api_operations/CONVENTIONS.md)
- **Общие правила:** [CLAUDE.md](../../CLAUDE.md)
