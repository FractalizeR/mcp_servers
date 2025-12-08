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

- [ ] **Этап 1:** Консистентность конфигураций
  - [x] 1.1 Исправить tsconfig, vitest, knip
  - [ ] 1.2 Исправить turbo.json и скрипты пакетов

- [ ] **Этап 2:** Версионирование и CI
  - [ ] 2.1 Настроить Changesets
  - [ ] 2.2 Исправить CI workflows

- [ ] **Этап 3:** Оптимизация (опционально)
  - [ ] 3.1 Оптимизировать devDependencies
  - [ ] 3.2 Обновить правила dependency-cruiser

---

## Промпт для продолжения

```
Продолжи выполнение плана из .agentic-planning/plan_build_infrastructure_review/

Текущий этап: 1.1 (fix_config_consistency)

Прочитай README.md и файл текущего этапа, затем выполни чеклист.
После завершения этапа — отметь прогресс и предложи следующий шаг.
```

---

## Важные решения (требуют согласования)

1. **Версионирование:** Fixed (все framework пакеты — одна версия) или Independent?
   - Рекомендация: Fixed для framework, Independent для servers

2. **|| true в скриптах:** Убрать полностью или оставить для dev?
   - Рекомендация: Убрать, настроить инструменты на warn

3. **devDependencies hoisting:** Вынести в корень или оставить в пакетах?
   - Рекомендация: Вынести общие (typescript, vitest, etc.)

---

## Критерии успешного завершения

- [ ] Все пакеты включены в корневые конфигурации
- [ ] Скрипты validate единообразны во всех пакетах
- [ ] Changesets настроен и работает
- [ ] CI не игнорирует ошибки
- [ ] `npm run validate:quiet` проходит из корня
