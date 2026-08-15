// tests/helpers/server-config.fixture.ts
import type { ServerConfig } from '../../src/config/server-config.interface.js';

/**
 * Создать полностью типизированный fixture для ServerConfig.
 *
 * L11 (typecheck-аудит .agentic-planning): smoke-тесты годами собирали
 * частичные ServerConfig-объекты вручную — под `tsc --noEmit` (default
 * tsconfig, только `src/**`) это не ловилось, потому что `tests/` не
 * участвовал в typecheck. Единая фикстура с полным набором обязательных
 * полей закрывает класс этой проблемы разом.
 */
export function createServerConfigFixture(overrides?: Partial<ServerConfig>): ServerConfig {
  return {
    token: 'OAuth fake-token-for-testing',
    orgId: 'fake-org-id',
    apiBase: 'https://api.wiki.yandex.net',
    requestTimeout: 30000,
    maxBatchSize: 50,
    maxConcurrentRequests: 10,
    logLevel: 'error',
    prettyLogs: false,
    logsDir: '/tmp/logs',
    logMaxSize: 10485760,
    logMaxFiles: 5,
    retryAttempts: 3,
    retryMinDelay: 1000,
    retryMaxDelay: 10000,
    ...overrides,
  };
}
