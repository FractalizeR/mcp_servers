/**
 * Таблица правил области действия живого прогона: проверяются сверху вниз, первое
 * совпавшее решает; не совпало ни одно — отказ (`decideRequest`).
 *
 * Порядок — часть правил, поэтому таблица собрана в одном месте, а не разбросана
 * по предметам: сущности песочной очереди идут раньше сущностей организации, иначе
 * общее правило очередей перехватило бы компоненты и локальные поля очереди `TEST`.
 *
 * Обзор допуска — `README.md`, канон живых прогонов — `tests/TESTING_STRATEGY.md` §1.
 */

import type { ScopeRule } from './rule-matching.js';
import { SANDBOX_QUEUE_RULES } from './sandbox-queue-rules.js';
import { ORGANIZATION_RULES } from './organization-rules.js';

export type { ScopeContext, ScopeDecision, ScopeRule } from './rule-matching.js';

export const SCOPE_RULES: readonly ScopeRule[] = [...SANDBOX_QUEUE_RULES, ...ORGANIZATION_RULES];
