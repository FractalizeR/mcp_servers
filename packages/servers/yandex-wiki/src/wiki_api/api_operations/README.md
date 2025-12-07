# API Operations — Yandex Wiki

**Низкоуровневые операции для HTTP-запросов к Wiki API**

---

## Назначение

API Operations — тонкий слой над HTTP:
- Один класс = один API endpoint
- Типизированные входы/выходы
- Без бизнес-логики

---

## Структура

```
api_operations/
├── grids/
│   └── get-grids.operation.ts
├── pages/
│   ├── get-page.operation.ts
│   └── search-pages.operation.ts
└── index.ts
```

---

## Правила

### 1. Naming convention
```
{verb}-{resource}.operation.ts
```
Примеры: `get-page.operation.ts`, `search-pages.operation.ts`

### 2. Структура класса

```typescript
@injectable()
export class GetPageOperation {
  constructor(
    @inject(TYPES.HttpClient) private readonly http: HttpClient,
    @inject(TYPES.ServerConfig) private readonly config: ServerConfig,
  ) {}

  async execute(pageId: string): Promise<WikiPage> {
    const response = await this.http.get<WikiPage>(
      `/api/wiki/v2/pages/${pageId}`
    );
    return response.data;
  }
}
```

### 3. Не вызывай напрямую из Tools
Tools должны использовать Facade, не Operations.

---

## Дополнительная документация

- **Facade:** [../facade/README.md](../facade/README.md)
- **DTO:** [../dto/README.md](../dto/README.md)
