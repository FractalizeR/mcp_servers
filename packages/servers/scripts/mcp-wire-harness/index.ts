/**
 * Проводной харнесс к собранному бандлу MCP-сервера.
 *
 * Предмет модуля — транспорт и жизненный цикл дочернего процесса сервера в
 * тестовом контуре: спавн бандла, чтение потоков без порчи UTF-8, ожидание
 * ответа/готовности по событиям, останов, подставной HTTP-API и прогон
 * именованных сценариев.
 *
 * Здесь НЕТ ни одного сценария — только их низ. Сценарии живут рядом с
 * сервером, которому принадлежат: `packages/servers/<server>/scripts/`.
 */

export {
  assertUtf8Chunk,
  assertNoDecodingDamage,
  collectUtf8,
  MISMATCH_CONTEXT_CHARS,
} from './utf8-stream.js';
export { describeToolsListMismatch } from './tools-list-diagnostics.js';
export { stopGracefully, waitForStderrSubstring, SHUTDOWN_GRACE_MS } from './process-lifecycle.js';
export {
  ServerHarness,
  createWithServer,
  legacyInitialize,
  modernMeta,
  RESPONSE_TIMEOUT_MS,
  type JsonRpcError,
  type JsonRpcResponse,
  type WireServerConfig,
} from './wire-session.js';
export {
  FakeApiServer,
  sendJson,
  type FakeApiHandler,
  type FakeApiRequest,
} from './fake-api-server.js';
export { ScenarioRunner, assert, normalizeVolatileContent } from './scenario-runner.js';
export { runSmokeTest, type SmokeConfig, type SmokeMessages } from './smoke-test.js';
