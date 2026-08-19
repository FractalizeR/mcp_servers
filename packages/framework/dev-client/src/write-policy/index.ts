/**
 * Политика записи: классификация read/write/local-side-effect и допуск батча.
 * @packageDocumentation
 */

export { classify, hasPathLikeProperty, type ToolClass, type ToolSummary } from './classify.js';
export { assertAllowed, WritePolicyError, type BatchCallLike } from './assert-allowed.js';
