/**
 * Область действия живого прогона — публичная поверхность модуля.
 *
 * Единственный потребитель в продовом пути — composition-root, который спрашивает
 * `createLiveScopeGuardFromEnv()` и передаёт результат в конфигурацию HTTP-клиента.
 * Остальное экспортируется для тестов рубежа.
 */

export { createLiveScopeGuardFromEnv } from './live-scope.config.js';
export { LiveScopeGuard, decideRequest } from './live-scope.guard.js';
export { RunJournal } from './run-journal.js';
export type { EntityKind } from './run-journal.js';
export type { ScopeContext, ScopeDecision } from './scope-rules.js';
