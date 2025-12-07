# DTO — Data Transfer Objects

**Типизированные объекты для API ответов**

---

## Назначение

DTO — объекты для передачи данных между слоями:
- Типизация API-ответов
- Отделение от внутренних entities
- Zod-валидация (где нужно)

---

## Структура

```
dto/
├── pages/
│   ├── wiki-page.dto.ts
│   └── index.ts
├── grids/
│   ├── wiki-grid.dto.ts
│   └── index.ts
└── index.ts
```

---

## Паттерн

```typescript
// wiki-page.dto.ts
export interface WikiPageDTO {
  id: string;
  title: string;
  content: string;
  author: WikiAuthorDTO;
  createdAt: string;
  updatedAt: string;
}

// С Zod (опционально)
export const WikiPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
});
export type WikiPageDTO = z.infer<typeof WikiPageSchema>;
```

---

## Правила

1. DTO — простые интерфейсы/типы, без методов
2. Naming: `{Resource}DTO` или `{Resource}ResponseDTO`
3. Zod-схемы для валидации входных данных
