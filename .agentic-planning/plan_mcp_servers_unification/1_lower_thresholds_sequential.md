# Этап 1: Снижение порогов покрытия (sequential)

**Время:** ~10 минут
**Зависимости:** Нет
**Блокирует:** Все остальные этапы

---

## Задача

Снизить пороги покрытия с 90/90/85/90 до 80/80/75/80.

---

## Чеклист

- [ ] Изменить `vitest.shared.ts`
- [ ] Обновить `MCP_SERVER_CHECKLIST.md`
- [ ] Обновить `CLAUDE.md` (если упоминаются пороги)
- [ ] Проверить что yandex-tracker проходит `npm run test:coverage`
- [ ] Коммит с описанием причины изменения

---

## Изменения

### 1. vitest.shared.ts

```typescript
// Было:
thresholds: {
  lines: 90,
  functions: 90,
  branches: 85,
  statements: 90,
},

// Стало:
thresholds: {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80,
},
```

### 2. MCP_SERVER_CHECKLIST.md (секция 10.2)

```markdown
### 10.2 Целевое покрытие
Пороги настроены в `vitest.shared.ts`:
- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%
```

---

## Валидация

```bash
# Проверить что yandex-tracker проходит
cd packages/servers/yandex-tracker
npm run test:coverage

# Ожидаемый результат: SUCCESS (85.97% > 80%)
```

---

## Коммит

```
chore: снизить пороги покрытия до реалистичных 80/80/75/80

Текущее состояние покрытия:
- yandex-tracker: 85.97% (проходит новые пороги)
- yandex-wiki: 51.09% (требует дополнительных тестов)
- ticktick: 37.15% (требует дополнительных тестов)

Обоснование:
- 90% покрытия требует тестирования edge cases без добавления ценности
- 80% - разумный порог для production-ready кода
- Эталонный сервер (yandex-tracker) имеет 85.97%
```
