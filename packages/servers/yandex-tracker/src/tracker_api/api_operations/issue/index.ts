/**
 * Issue operations модуль - экспорт операций для работы с задачами
 */

// Get operations (batch only)
export { GetIssuesOperation } from '@tracker_api/api_operations/issue/get-issues.operation.js';
export type { BatchIssueResult } from './get-issues.operation.js';

// Find operations (search)
export { FindIssuesOperation } from './find/index.js';
export type { FindIssuesResult } from './find/index.js';

// Create operations
export { CreateIssueOperation } from './create/index.js';

// Update operations
export { UpdateIssueOperation } from './update/index.js';

// Changelog operations
export { GetIssueChangelogOperation } from './changelog/index.js';

// Transitions operations
export { GetIssueTransitionsOperation, TransitionIssueOperation } from './transitions/index.js';
