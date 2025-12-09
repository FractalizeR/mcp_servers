# Этап 5: Финальная валидация (sequential)

**Время:** ~30 минут
**Зависимости:** Все предыдущие этапы

---

## Задача

Убедиться что все серверы проходят полную валидацию.

---

## Чеклист

### Yandex Tracker (эталон)
- [ ] `npm run validate` проходит
- [ ] `npm run test:coverage` достигает порогов
- [ ] `npm run test:smoke:server` проходит

### Yandex Wiki
- [ ] `npm run validate` проходит
- [ ] `npm run test:coverage` достигает порогов
- [ ] `npm run test:smoke:server` проходит
- [ ] Все 5 smoke тестов зелёные

### TickTick
- [ ] `npm run validate` проходит
- [ ] `npm run test:coverage` достигает порогов
- [ ] `npm run test:smoke:server` проходит
- [ ] Все 5 smoke тестов зелёные

### Monorepo
- [ ] `npm run validate` в корне проходит
- [ ] `npm run build` в корне проходит
- [ ] Turborepo кэширует корректно

---

## Команды валидации

### Корневой уровень

```bash
# Из корня monorepo
cd /home/user/mcp_servers

# Полная валидация всех пакетов
npm run validate

# Сборка всех пакетов
npm run build

# Только серверы
turbo run validate --filter="./packages/servers/*"
```

### Yandex Tracker

```bash
cd packages/servers/yandex-tracker

# Полная валидация
npm run validate

# Покрытие
npm run test:coverage

# Smoke тесты
npm run test:smoke
npm run test:smoke:server

# Проверка регистрации tools
npm run validate:tools
```

### Yandex Wiki

```bash
cd packages/servers/yandex-wiki

# Полная валидация
npm run validate

# Покрытие
npm run test:coverage

# Smoke тесты
npm run test:smoke
npm run test:smoke:server

# Проверка регистрации tools
npm run validate:tools
```

### TickTick

```bash
cd packages/servers/ticktick

# Полная валидация
npm run validate

# Покрытие
npm run test:coverage

# Smoke тесты
npm run test:smoke
npm run test:smoke:server

# Проверка регистрации tools
npm run validate:tools
```

---

## Ожидаемые результаты

### Покрытие

| Сервер | Lines | Functions | Branches | Statements |
|--------|-------|-----------|----------|------------|
| yandex-tracker | ≥80% | ≥80% | ≥75% | ≥80% |
| yandex-wiki | ≥80% | ≥80% | ≥75% | ≥80% |
| ticktick | ≥80% | ≥80% | ≥75% | ≥80% |

### Smoke тесты

| Сервер | mcp-lifecycle | di-container | definition-gen | e2e-execution | tool-search |
|--------|---------------|--------------|----------------|---------------|-------------|
| yandex-tracker | ✅ | ✅ | ✅ | ✅ | ✅ |
| yandex-wiki | ✅ | ✅ | ✅ | ✅ | ✅ |
| ticktick | ✅ | ✅ | ✅ | ✅ | ✅ |

### Служебные скрипты

| Сервер | generate:index | validate:tools | smoke-test-server |
|--------|----------------|----------------|-------------------|
| yandex-tracker | ✅ | ✅ | ✅ |
| yandex-wiki | ✅ | ✅ | ✅ |
| ticktick | ✅ | ✅ | ✅ |

---

## Возможные проблемы

### 1. Покрытие не достигает порогов

```bash
# Проверить какие файлы не покрыты
npm run test:coverage

# Смотреть отчёт в coverage/lcov-report/index.html
```

**Решение:** Добавить тесты для непокрытых файлов.

### 2. Smoke тест падает

```bash
# Запустить конкретный тест с verbose
npx vitest run tests/smoke/failing-test.smoke.test.ts --reporter=verbose
```

**Решение:** Проверить импорты, конфигурацию, моки.

### 3. smoke-test-server.ts падает

```bash
# Запустить с отладкой
DEBUG=* tsx scripts/smoke-test-server.ts
```

**Решение:** Проверить bundle файл, переменные окружения.

---

## Финальный коммит

```
chore: завершить унификацию MCP серверов

Результаты:
- Пороги покрытия снижены до 80/80/75/80
- Все серверы проходят npm run validate
- Все серверы имеют 5/5 smoke тестов
- Все серверы имеют служебные скрипты

Покрытие:
- yandex-tracker: X%
- yandex-wiki: X%
- ticktick: X%
```

---

## После завершения

1. **Удалить план** - `.agentic-planning/plan_mcp_servers_unification/`
2. **Обновить findings** - пометить все задачи как выполненные
3. **Создать PR** с описанием изменений
