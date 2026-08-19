/**
 * Разбор JSONL, прогон в одной сессии, агрегация.
 * @packageDocumentation
 */

export { parseBatch, type ParseBatchResult, type ParseBatchError } from './parse-batch.js';
export {
  runBatch,
  CallTimeoutError,
  type RunBatchOptions,
  type CallToolSession,
} from './run-batch.js';
export type { BatchCall, BatchCallOutcome, BatchExpectation, BatchOutcome } from './types.js';
