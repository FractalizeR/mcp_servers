/**
 * MCP Resources провайдеры TickTick (пакет 5.1.C.ticktick плана
 * модернизации MCP 2026-07-28).
 */

export { TaskResourceProvider, buildTaskResourceUri } from './task-resource.provider.js';
export { ProjectResourceProvider, buildProjectResourceUri } from './project-resource.provider.js';
export { paginateOffset } from './pagination.js';
export type { OffsetPage } from './pagination.js';
