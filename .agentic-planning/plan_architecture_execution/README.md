# План выполнения архитектурного рефакторинга

**На основе:** plan_architecture_analysis (Phase 3 Consolidated Plan)
**Сценарий:** Full Refactoring (Сценарий 3)
**Параллелизация:** 3-4 агента

---

## 📋 Структура плана

### Этап 0: Планирование (SEQUENTIAL)

**Цель:** Создать детальный план рефакторинга YandexTrackerFacade перед началом выполнения

- **[0.1_facade_planning_sequential.md](./0.1_facade_planning_sequential.md)** - Анализ и планирование Facade (2-3ч)

---

### Этап 1: Foundation + Quick Wins (MIXED)

**Этап 1A - SEQUENTIAL (блокирует Phase 2):**
- **[1.1_infrastructure_extraction_sequential.md](./1.1_infrastructure_extraction_sequential.md)** - Infrastructure extraction (6-8ч)

**Этап 1B - PARALLEL (3 агента):**
- **[1.2_test_coverage_parallel.md](./1.2_test_coverage_parallel.md)** - Test Coverage improvements (9-10.5ч)
- **[1.3_code_quality_parallel.md](./1.3_code_quality_parallel.md)** - Code Quality improvements (8-12ч)
- **[1.4_yandex_tracker_parallel.md](./1.4_yandex_tracker_parallel.md)** - Yandex-Tracker improvements (7-11ч)

---

### Этап 2: Architecture Foundation (SEQUENTIAL + Partial Parallel)

**SEQUENTIAL (блокеры):**
- **[2.1_facade_refactoring_sequential.md](./2.1_facade_refactoring_sequential.md)** - YandexTrackerFacade рефакторинг (17-24ч последовательно / 12-17ч параллельно)
- **[2.2_tool_registry_sequential.md](./2.2_tool_registry_sequential.md)** - ToolRegistry refactoring (4-6ч)

**PARALLEL (могут идти вместе с 2.2):**
- **[2.3_framework_improvements_parallel.md](./2.3_framework_improvements_parallel.md)** - HttpClient interface + generated-index (3-5ч)

---

### Этап 3: Post-Architecture (PARALLEL)

- **[3.1_post_architecture_parallel.md](./3.1_post_architecture_parallel.md)** - DI tests, Entity review, text utils, LRU (3.5-5ч)

---

### Этап 4: Polish & Documentation (OPTIONAL, PARALLEL)

- **[4.1_polish_parallel.md](./4.1_polish_parallel.md)** - Test optimization, monitoring, docs (6ч)

---

## 🎯 Порядок выполнения

```
Этап 0: Facade Planning (ПЕРВЫМ ДЕЛОМ!)
   └─> 0.1 Facade Planning (2-3h, 1 agent) ✋ STOP после этого

[После утверждения плана Facade создать детальный 2.1_facade_refactoring_sequential.md]

Этап 1A: Infrastructure Extraction (БЛОКИРУЕТ Этап 2)
   └─> 1.1 Infrastructure extraction (6-8h, 1 agent)

Этап 1B: Quick Wins (ПАРАЛЛЕЛЬНО с 1A или после)
   ├─> 1.2 Test Coverage (9-10.5h, Agent 1)
   ├─> 1.3 Code Quality (8-12h, Agent 2)
   └─> 1.4 Yandex-Tracker (7-11h, Agent 3)

[Merge веток 1B]

Этап 2: Architecture Foundation (после 1A)
   ├─> 2.1 Facade Refactoring (17-24h последовательно / 12-17h с 4 агентами, BLOCKER)
   ├─> 2.2 ToolRegistry (4-6h, 1 agent, после 1.1)
   └─> 2.3 Framework improvements (3-5h, parallel с 2.2)

Этап 3: Post-Architecture (после 2)
   └─> 3.1 All tasks (3.5-5h, 1-2 agents parallel)

Этап 4: Polish (опционально, после 3)
   └─> 4.1 All tasks (6h, 1 agent)
```

---

## ⏱️ Timeline

| Этап | Wall Time | Агенты | Зависимости |
|------|-----------|--------|--------------|
| Этап 0 | 2-3h | 1 | - |
| Этап 1A | 6-8h | 1 | Этап 0 done |
| Этап 1B | 11-12h | 3 parallel | Может быть parallel с 1A |
| Merge 1B | 1-2h | 1 | Этап 1B done |
| Этап 2 | 24-35h seq / 19-28h parallel | 1-4 | Этап 1A done |
| Этап 3 | 3.5-5h | 1-2 | Этап 2 done |
| Этап 4 | 6h | 1 | Этап 3 done |
| **TOTAL** | **54-73h** (seq) / **49-64h** (parallel) | - | **10-14 дней** |

---

## 🚦 Статус выполнения

| Этап | Файл | Статус | Дата |
|------|------|--------|------|
| 0.1 | Facade Planning | ⏸️ Pending | - |
| 1.1 | Infrastructure | ⏸️ Pending | - |
| 1.2 | Test Coverage | ⏸️ Pending | - |
| 1.3 | Code Quality | ⏸️ Pending | - |
| 1.4 | Yandex-Tracker | ⏸️ Pending | - |
| 2.1 | Facade Refactoring | ⏸️ Pending | - |
| 2.2 | ToolRegistry | ⏸️ Pending | - |
| 2.3 | Framework Improvements | ⏸️ Pending | - |
| 3.1 | Post-Architecture | ⏸️ Pending | - |
| 4.1 | Polish | ⏸️ Pending | - |

**Легенда:** ⏸️ Pending | 🏗️ In Progress | ✅ Completed | ⏭️ Skipped | ❌ Blocked

---

## 📝 Правила выполнения

### 1. Branching Strategy

**Для sequential этапов:**
```bash
claude/execution-0.1-facade-planning-{session_id}
claude/execution-1.1-infrastructure-{session_id}
```

**Для parallel этапов (1B):**
```bash
claude/execution-1.2-test-coverage-{session_id}
claude/execution-1.3-code-quality-{session_id}
claude/execution-1.4-yandex-tracker-{session_id}
```

### 2. Validation

**После каждого этапа:**
```bash
npm run validate:quiet
```

**После этапов с тестами:**
```bash
npm run test:coverage
```

### 3. Commits & Push

- После каждой завершенной задачи - коммит
- После завершения этапа - пуш
- Формат коммитов: см. CLAUDE.md

### 4. Checkpoints

**Обязательные остановки для review:**
- ✋ После Этапа 0 (Facade plan) - утверждение плана
- ✋ После Этапа 1A (Infrastructure) - проверка что разблокировано
- ✋ После Merge 1B - review качества
- ✋ После Этапа 2.1 (Facade) - критический review архитектуры
- ✋ После Этапа 2 - финальная архитектура
- ✋ После Этапа 4 - итоговый review

---

## 🔗 Ссылки

- **Анализ:** [../plan_architecture_analysis/](../plan_architecture_analysis/)
- **Консолидированный план:** [../plan_architecture_analysis/CONSOLIDATED_EXECUTION_PLAN.md](../plan_architecture_analysis/CONSOLIDATED_EXECUTION_PLAN.md)
- **Decision Guide:** [../plan_architecture_analysis/DECISION_GUIDE.md](../plan_architecture_analysis/DECISION_GUIDE.md)

---

**Создано:** 2025-11-21
**Статус:** 🏗️ В процессе создания детальных планов
**Следующий шаг:** Создать детальные планы для каждого этапа
