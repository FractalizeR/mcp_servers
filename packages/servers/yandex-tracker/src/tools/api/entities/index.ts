/**
 * Экспорты для Entity API tools (Goal/Project/Portfolio + Key Results)
 *
 * ВАЖНО: Entity API (`entityType: 'goal'|'project'|'portfolio'`), НЕ legacy
 * `/v2/projects` (см. `#tools/api/projects/index.js`) — разные коллекции,
 * разные идентификаторы. См. `entities/entity-api.entity.ts`.
 */

// Find Entities
export { FindEntitiesTool } from './find-entities.tool.js';
export { FindEntitiesParamsSchema, type FindEntitiesParams } from './find-entities.schema.js';

// Get Entity
export { GetEntityTool } from './get-entity.tool.js';
export { GetEntityParamsSchema, type GetEntityParams } from './get-entity.schema.js';

// Create Entity
export { CreateEntityTool } from './create-entity.tool.js';
export { CreateEntityParamsSchema, type CreateEntityParams } from './create-entity.schema.js';

// Update Entity
export { UpdateEntityTool } from './update-entity.tool.js';
export { UpdateEntityParamsSchema, type UpdateEntityParams } from './update-entity.schema.js';

// Delete Entity
export { DeleteEntityTool } from './delete-entity.tool.js';
export { DeleteEntityParamsSchema, type DeleteEntityParams } from './delete-entity.schema.js';

// Get Goal Key Results
export { GetGoalKeyResultsTool } from './get-goal-key-results.tool.js';
export {
  GetGoalKeyResultsParamsSchema,
  type GetGoalKeyResultsParams,
} from './get-goal-key-results.schema.js';

// Add Goal Key Result
export { AddGoalKeyResultTool } from './add-goal-key-result.tool.js';
export {
  AddGoalKeyResultParamsSchema,
  type AddGoalKeyResultParams,
} from './add-goal-key-result.schema.js';

// Set Goal Key Results
export { SetGoalKeyResultsTool } from './set-goal-key-results.tool.js';
export {
  SetGoalKeyResultsParamsSchema,
  type SetGoalKeyResultsParams,
} from './set-goal-key-results.schema.js';

// Clear Goal Key Results
export { ClearGoalKeyResultsTool } from './clear-goal-key-results.tool.js';
export {
  ClearGoalKeyResultsParamsSchema,
  type ClearGoalKeyResultsParams,
} from './clear-goal-key-results.schema.js';
