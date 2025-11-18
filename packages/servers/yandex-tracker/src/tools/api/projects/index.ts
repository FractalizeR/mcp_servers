/**
 * Project Tools модуль - экспорт всех MCP tools для работы с проектами
 *
 * ВАЖНО: Текущий статус - частично реализовано
 * - ✅ get-project tool (полностью)
 * - ⏳ get-projects tool (TODO)
 * - ⏳ create-project tool (TODO)
 * - ⏳ update-project tool (TODO)
 * - ⏳ delete-project tool (TODO)
 */

// GetProject tool
export { GetProjectTool } from './get-project.tool.js';
export { GetProjectDefinition } from './get-project.definition.js';
export { GetProjectParamsSchema, type GetProjectParams } from './get-project.schema.js';

// TODO: Добавить экспорты остальных tools после их реализации
// export { GetProjectsTool } from './get-projects.tool.js';
// export { CreateProjectTool } from './create-project.tool.js';
// export { UpdateProjectTool } from './update-project.tool.js';
// export { DeleteProjectTool } from './delete-project.tool.js';
