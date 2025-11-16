# Этап 8: Mutation Testing

**Приоритет:** 🟢 БУДУЩЕЕ
**Estimate:** 2 дня
**Impact:** LOW
**Effort:** HIGH

---

## 📊 Что такое Mutation Testing?

Mutation testing проверяет **качество самих тестов** путем внесения изменений (мутаций) в код и проверки, обнаружат ли тесты эти изменения.

**Пример:**
```typescript
// Исходный код
if (status === 'open') {
  return true;
}

// Мутация 1: изменение оператора
if (status !== 'open') { // ❌ Если тест НЕ упал — плохой тест
  return true;
}

// Мутация 2: изменение значения
if (status === 'closed') { // ❌ Если тест НЕ упал — плохой тест
  return true;
}
```

---

## 🎯 Цели

1. Оценить качество существующих тестов
2. Найти "слепые зоны" в тестовом покрытии
3. Достичь 80%+ mutation score

---

## 📋 План

### Шаг 1: Выбор инструмента

**Рекомендуется: Stryker**

```bash
npm install -D @stryker-mutator/core
npm install -D @stryker-mutator/vitest-runner
npm install -D @stryker-mutator/typescript-checker
```

**Альтернативы:**
- ts-mutate
- mutode

### Шаг 2: Конфигурация

```javascript
// stryker.conf.js
module.exports = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // Fail if mutation score <50%
  },
};
```

### Шаг 3: Запуск

```bash
# Первый запуск (займет время!)
npx stryker run

# Для конкретных файлов
npx stryker run --mutate "src/mcp/tools/**/*.ts"
```

### Шаг 4: Анализ результатов

**Типичные проблемы:**

1. **Survived Mutants** — мутации, не обнаруженные тестами
   ```typescript
   // Код
   const limit = params.limit || 10;

   // Мутация: limit = params.limit || 100
   // Если тест НЕ проверяет дефолтное значение — mutant survived
   ```

2. **Timeout** — мутации вызывают бесконечные циклы
   ```typescript
   // Код
   while (index < items.length) { ... }

   // Мутация: while (index <= items.length)
   // Может вызвать timeout
   ```

3. **Equivalent Mutants** — мутации не меняющие поведение
   ```typescript
   // Код
   return status === 'open' ? true : false;

   // Мутация: return status === 'open' ? false : true;
   // Эквивалентно return status !== 'open'
   ```

### Шаг 5: Улучшение тестов

**Для каждого survived mutant:**
1. Понять почему тест не обнаружил мутацию
2. Добавить тест или улучшить существующий
3. Запустить Stryker снова

**Пример:**
```typescript
// Survived mutant: limit || 10 → limit || 100

// Добавить тест
it('должен использовать дефолтное значение limit', () => {
  const result = service.execute({ /* limit не указан */ });
  expect(result).toHaveLength(10); // ✅ Теперь мутация будет обнаружена
});
```

---

## 📈 Метрики

**Mutation Score:**
```
Mutation Score = (Killed Mutants / Total Mutants) * 100
```

**Целевые показатели:**
- Initial: 60%+
- Target: 80%+
- Excellent: 90%+

**Mutation Coverage vs Code Coverage:**
- Code Coverage 80% + Mutation Score 60% = **Real Quality ~50%**
- Code Coverage 80% + Mutation Score 80% = **Real Quality ~65%**

---

## ✅ Критерии завершения

- [x] Stryker настроен и запущен
- [x] Mutation score ≥80%
- [x] Все survived mutants проанализированы
- [x] Тесты улучшены для критичных компонентов
- [x] Документация с baseline metrics

---

## 🚨 Предупреждения

- ⚠️ Mutation testing **ОЧЕНЬ медленный** (часы для большого проекта)
- ⚠️ Запускать только для критичных компонентов
- ⚠️ Не гнаться за 100% mutation score (diminishing returns)

---

## 📝 Пример отчета

```markdown
# Mutation Testing Report

**Date:** 2025-11-16
**Tool:** Stryker v8.0.0

## Summary
| Metric | Value |
|--------|-------|
| Total Mutants | 1,247 |
| Killed | 1,018 (81.6%) |
| Survived | 156 (12.5%) |
| Timeout | 48 (3.8%) |
| No Coverage | 25 (2.0%) |

## Mutation Score: 81.6% ✅

## Top Survived Mutants
1. `src/mcp/tools/api/issues/get/get-issues.tool.ts:45` - Block statement removal
2. `src/infrastructure/cache/lru-cache.ts:23` - Equality operator mutation
3. ...

## Action Items
- [ ] Add test for default limit value
- [ ] Improve error handling tests
- [ ] Cover edge case in cache eviction
```

---

**Ресурсы:**
- [Stryker Mutator](https://stryker-mutator.io/)
- [Mutation Testing Guide](https://stryker-mutator.io/docs/General/example/)
- [Mutation Testing Best Practices](https://www.softwaretestinghelp.com/mutation-testing/)
