# Composition Root & Dependency Injection

**Единственное место для создания и связывания зависимостей**

---

## Назначение

**Composition Root** — точка входа DI:
- Инкапсулирует создание объектов
- Использует InversifyJS для DI
- Только `src/server.ts` может импортировать

---

## Структура

```
src/composition-root/
├── definitions/              # Автоматическая регистрация
│   ├── index.ts
│   ├── tool-definitions.ts   # Массив Tool классов
│   └── operation-definitions.ts
├── types.ts                  # Symbol-based DI токены
├── container.ts              # Конфигурация контейнера
├── validation.ts             # Валидация регистраций
└── index.ts                  # Публичный API
```

---

## DI токены (types.ts)

```typescript
export const TYPES = {
  ServerConfig: Symbol.for('ServerConfig'),
  HttpClient: Symbol.for('HttpClient'),
  YandexWikiFacade: Symbol.for('YandexWikiFacade'),
  // ... operations & tools
} as const;
```

---

## Декларативная регистрация

**Для добавления нового Tool/Operation:**

```typescript
// definitions/tool-definitions.ts
export const TOOL_CLASSES = [
  PingTool,
  GetPageTool,
  NewTool,  // <- добавить одну строку
] as const;
```

Всё остальное (символы, регистрация) — автоматически.

---

## Валидация

`validateDIRegistrations()` проверяет:
- Уникальность имён классов
- Корректность регистраций

---

## Дополнительная документация

- **InversifyJS:** https://inversify.io/
- **Yandex Wiki Server:** [README.md](../../README.md)
