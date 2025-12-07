# Entities — Доменные модели

**Внутренние типизированные модели данных**

---

## Назначение

Entities — доменные объекты:
- Внутреннее представление данных
- Могут содержать бизнес-логику
- Отделены от API DTO

---

## Структура

```
entities/
├── wiki-page.entity.ts
├── wiki-grid.entity.ts
└── index.ts
```

---

## Отличие от DTO

| DTO | Entity |
|-----|--------|
| API-ответ как есть | Внутренняя модель |
| Без методов | Может иметь методы |
| snake_case (API) | camelCase |

---

## Пример

```typescript
// wiki-page.entity.ts
export interface WikiPage {
  id: string;
  title: string;
  content: string;
  author: WikiAuthor;
  createdAt: Date;  // Date, не string
  updatedAt: Date;
}
```
