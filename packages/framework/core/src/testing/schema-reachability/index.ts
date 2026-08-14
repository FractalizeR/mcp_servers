/**
 * Проверка достижимости параметров инструмента (пакет 7.1.E плана
 * модернизации MCP 2026-07-28) — единственный экземпляр во framework вместо
 * прежних двух серверных дублей (Трекер/Wiki). См. заголовки файлов этого
 * каталога за деталями сведения подходов.
 *
 * Импортируется тест-файлами серверов через
 * `@fractalizer/mcp-core/testing/schema-reachability/index.js`
 * (wildcard-экспорт `"./*"` в package.json) — этот путь НЕ входит в
 * основной барель `@fractalizer/mcp-core`, чтобы тестовый механизм не
 * тянулся в обычный `import { ... } from '@fractalizer/mcp-core'`
 * production-кода серверов. Ни один файл каталога не импортирует тест-раннер
 * (`http-client-call-recorder.ts` подменяет методы `IHttpClient` обычным
 * присваиванием свойств, без `vi.spyOn`/`vitest`) — граф импортов пакета из
 * npm остаётся чистым, это проверяет `knip:root` в корневой валидации.
 */

export type {
  ReachabilityLeaf,
  ReachabilitySample,
  GenerateReachabilitySampleOptions,
} from './generate-reachability-sample.js';
export { generateReachabilitySample } from './generate-reachability-sample.js';

export type { ReachabilityException, UnreachableLeaf } from './find-unreachable-leaves.js';
export { findUnreachableLeaves, describeUnreachableLeaf } from './find-unreachable-leaves.js';

export type { HttpClientCallRecorder } from './http-client-call-recorder.js';
export { createHttpClientCallRecorder } from './http-client-call-recorder.js';
