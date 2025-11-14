/**
 * Экспорт всех MCP инструментов
 *
 * Каждый инструмент находится в отдельном файле
 * согласно принципу Single Responsibility Principle (SRP)
 */

export { BaseTool } from '@mcp/tools/base-tool.js';
export type { ToolDefinition } from './base-tool.js';
export { PingTool } from '@mcp/tools/ping.tool.js';
export { GetIssuesTool } from '@mcp/tools/get-issues.tool.js';

// Здесь будут добавляться новые инструменты:
// export { CreateIssueTool } from '@mcp/tools/create-issue.tool.js';
// export { UpdateIssueTool } from '@mcp/tools/update-issue.tool.js';
// export { SearchIssuesTool } from '@mcp/tools/search-issues.tool.js';
