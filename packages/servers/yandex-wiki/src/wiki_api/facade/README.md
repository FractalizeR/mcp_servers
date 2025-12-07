# Yandex Wiki Facade

**Единая точка входа для работы с Wiki API**

---

## Назначение

`YandexWikiFacade` — высокоуровневый API:
- Инкапсулирует бизнес-логику
- Объединяет вызовы нескольких операций
- Используется MCP Tools

---

## Архитектура

```
MCP Tool → YandexWikiFacade → Services → API Operations → HttpClient
```

**Services:**
- `PageService` — работа со страницами
- `GridService` — работа с гридами
- `ResourceService` — загрузка ресурсов

---

## Использование

```typescript
@inject(TYPES.YandexWikiFacade)
private readonly facade: YandexWikiFacade;

async execute() {
  const page = await this.facade.getPage(pageId);
}
```

---

## Правила

1. Tools используют ТОЛЬКО Facade, не Operations напрямую
2. Facade делегирует вызовы соответствующим Services
3. Services используют Operations для HTTP-вызовов
