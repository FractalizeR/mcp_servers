# Template-based Mock Generator

## Концепция

Вместо ручного создания функций-генераторов для каждого типа объекта API, мы используем **JSON-шаблоны** из реального API и автоматически рандомизируем чувствительные данные по умным правилам.

## Преимущества

✅ **Масштабируемость**: Добавил новый JSON шаблон → получил генератор
✅ **Актуальность**: Шаблоны из реального API → фикстуры всегда соответствуют структуре
✅ **Безопасность**: Автоматическая замена чувствительных данных (IDs, emails, имена)
✅ **Гибкость**: Кастомизация через `overrides` без изменения шаблона
✅ **Чистота кода**: Нет раздувания кода при добавлении новых типов

## Структура

```
tests/integration/
├── templates/           # JSON шаблоны из реального API
│   ├── issue.json      # Шаблон задачи
│   ├── user.json       # Шаблон пользователя
│   └── ...             # Другие шаблоны (просто добавь файл!)
└── helpers/
    ├── template-based-generator.ts  # Умный генератор
    └── mock-server.ts               # Использует генератор
```

## Как добавить новый тип объекта?

### 1. Получи JSON из реального API

```bash
# Например, для пользователя
curl -H "Authorization: OAuth $TOKEN" \
  https://api.tracker.yandex.net/v3/users/1130000000000001 \
  > tests/integration/templates/user.json
```

### 2. Создай генератор (1 строка!)

```typescript
// tests/integration/helpers/template-based-generator.ts
export const generateUser = testFixtureFactory.create('user');
```

### 3. Готово! Используй в тестах

```typescript
import { generateUser } from '@integration/helpers/template-based-generator.js';

const user = generateUser({
  overrides: {
    login: 'test-user',
    display: 'Test User',
  },
});
```

## Как работает рандомизация?

Генератор автоматически определяет типы полей и применяет правила:

| Тип поля | Примеры ключей | Правило |
|----------|----------------|---------|
| MongoDB ObjectId | `id: "6253ebaffab26d0e966ab4fd"` | → случайный ObjectId (24 alphanumeric символа) |
| Passport UID | `passportUid: 4130000038722754` | → случайное число 1000000000-9999999999 |
| Cloud UID | `cloudUid: "ajemm8a2d8lr8n3no467"` | → `${random(4)}${random(16)}` |
| Email | `email: "user@example.com"` | → `test.user{N}@example.com` |
| Display Name | `display: "Иван Иванов"` | → случайное имя из списка |
| URL | `self: "https://..."` | → замена ID в URL |
| ISO Date | `createdAt: "2022-04-11T08:49:50.935+0000"` | → случайная дата в прошлом |
| Issue Key | `key: "QUEUE-1"` | → `TEST-{N}` |
| Boolean | `favorite: false` | → случайный true/false |

**Вложенные объекты и массивы** обрабатываются рекурсивно!

## Примеры использования

### Базовая генерация (все поля рандомизированы)

```typescript
import { generateIssue } from './template-based-generator.js';

const issue = generateIssue();
// → Все чувствительные данные заменены на рандомные
```

### С переопределениями (overrides)

```typescript
const issue = generateIssue({
  overrides: {
    key: 'MYQUEUE-123',
    summary: 'Specific summary',
    assignee: {
      id: 'specific-user-id',
      display: 'John Doe',
    },
  },
});
// → key, summary, assignee.id, assignee.display — как указано
// → Остальные поля — рандомизированы
```

### С сохранением оригинальных значений (preservePaths)

```typescript
const issue = generateIssue({
  preservePaths: ['createdAt', 'updatedAt'],
});
// → createdAt и updatedAt — из шаблона (не рандомизированы)
// → Остальные поля — рандомизированы
```

### С кастомными правилами рандомизации

```typescript
import { TemplateBasedGenerator } from './template-based-generator.js';

const customGenerator = new TemplateBasedGenerator([
  {
    matches: (key, value) => key === 'customField' && typeof value === 'string',
    generate: () => 'ALWAYS_THIS_VALUE',
  },
]);

const issue = customGenerator.generate(template, {
  overrides: { key: 'TEST-1' },
});
```

## Кастомные правила (для особых случаев)

Если стандартные правила не подходят, добавь свое:

```typescript
const customRules = [
  {
    matches: (key, value) => key === 'priority' && typeof value === 'number',
    generate: () => Math.random() > 0.5 ? 1 : 2, // Только 1 или 2
  },
];

const issue = generateIssue({ customRules });
```

## Migration Guide (со старого генератора)

### Было (старый генератор)

```typescript
import { generateIssueFixture } from './fixture-generator.js';

const issue = generateIssueFixture({
  issueKey: 'TEST-1',
  summary: 'My task',
  statusKey: 'open',
});
```

### Стало (template-based)

```typescript
import { generateIssue } from './template-based-generator.js';

const issue = generateIssue({
  overrides: {
    key: 'TEST-1',
    summary: 'My task',
    status: { key: 'open' },
  },
});
```

## FAQ

### Q: Как узнать структуру шаблона?

A: Открой соответствующий JSON файл в `tests/integration/templates/`

### Q: Что делать, если нужна особая логика генерации?

A: Используй `customRules` или просто создай обычную функцию для сложных случаев. Template-based подход — не серебряная пуля, а удобный инструмент для 90% случаев.

### Q: Можно ли использовать один шаблон для нескольких вариантов?

A: Да! Используй `overrides` для создания вариаций:

```typescript
const openIssue = generateIssue({ overrides: { status: { key: 'open' } } });
const closedIssue = generateIssue({ overrides: { status: { key: 'closed' } } });
```

### Q: Как обновить шаблон при изменении API?

A: Просто замени JSON файл новым ответом из API. Правила рандомизации применятся автоматически.
