# План исправления инфраструктуры сборки

**Дата создания:** 2025-12-08
**Статус:** Готов к выполнению

---

## Обзор

Анализ выявил проблемы в конфигурации сборки монорепозитория:
- Неполные конфигурации (tsconfig, vitest, knip)
- Неконсистентные скрипты между пакетами
- Отсутствие механизма версионирования
- Проблемы в CI workflows

---

## Порядок выполнения

```
1.1 fix_config_consistency (Sequential)
         ↓
1.2 fix_turbo_and_scripts (Sequential)
         ↓
    ┌────┴────┐
    ↓         ↓
2.1 setup   2.2 fix_ci
versioning  workflows
(Sequential) (Parallel)
    ↓         ↓
    └────┬────┘
         ↓
    ┌────┴────┐
    ↓         ↓
3.1 optimize  3.2 update
dependencies  depcruise
(Parallel)    (Parallel)
```

---

## Файлы плана

| Файл | Приоритет | Тип | Оценка |
|------|-----------|-----|--------|
| [1.1_fix_config_consistency_sequential.md](./1.1_fix_config_consistency_sequential.md) | Высокий | Sequential | ~30 мин |
| [1.2_fix_turbo_and_scripts_sequential.md](./1.2_fix_turbo_and_scripts_sequential.md) | Высокий | Sequential | ~45 мин |
| [2.1_setup_versioning_sequential.md](./2.1_setup_versioning_sequential.md) | Высокий | Sequential | ~1 час |
| [2.2_fix_ci_workflows_parallel.md](./2.2_fix_ci_workflows_parallel.md) | Средний | Parallel | ~30 мин |
| [3.1_optimize_dependencies_parallel.md](./3.1_optimize_dependencies_parallel.md) | Низкий | Parallel | ~20 мин |
| [3.2_update_depcruise_rules_parallel.md](./3.2_update_depcruise_rules_parallel.md) | Низкий | Parallel | ~15 мин |

**Общая оценка:** ~3 часа

---

## Общий прогресс

- [x] **Этап 1:** Консистентность конфигураций
  - [x] 1.1 Исправить tsconfig, vitest, knip
  - [x] 1.2 Исправить turbo.json и скрипты пакетов

- [x] **Этап 2:** Версионирование и CI
  - [x] 2.1 Настроить Semantic Release (автоматическое версионирование)
  - [x] 2.2 Исправить CI workflows

- [x] **Этап 3:** Оптимизация (опционально)
  - [x] 3.1 Оптимизировать devDependencies
  - [x] 3.2 Обновить правила dependency-cruiser

---

## Статус

**✅ ПЛАН ЗАВЕРШЁН**

Все этапы выполнены. План можно удалить.

---

## Принятые решения

1. **Версионирование:** Semantic Release (полная автоматизация)
   - Все пакеты синхронизируют версии
   - Версия определяется на основе conventional commits

2. **|| true в скриптах:** Убрано полностью
   - Ошибки видны в CI

3. **devDependencies hoisting:** Отложено (этап 3.1)

---

## Критерии успешного завершения

- [x] Все пакеты включены в корневые конфигурации
- [x] Скрипты validate единообразны во всех пакетах
- [x] Semantic Release настроен и работает
- [x] CI не игнорирует ошибки
- [x] `npm run validate:quiet` проходит из корня
