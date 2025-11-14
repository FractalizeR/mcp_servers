/**
 * Экспорт всех MCP инструментов
 *
 * Структура:
 * - base/ - базовые абстракции (BaseTool, BaseToolDefinition)
 * - common/ - переиспользуемые схемы и утилиты
 * - api/ - прямой доступ к Tracker API (1 tool = 1 API endpoint)
 * - helpers/ - композитные операции и сложная бизнес-логика
 */

// Базовые абстракции
export { BaseTool, BaseToolDefinition } from '@mcp/tools/base/index.js';
export type { ToolDefinition } from '@mcp/tools/base/index.js';

// Общие схемы и утилиты
export * from '@mcp/tools/common/index.js';

// API Tools
export * from '@mcp/tools/api/index.js';

// Helper Tools
export * from '@mcp/tools/helpers/index.js';

// Legacy tools (будут мигрированы)
export { PingTool } from '@mcp/tools/ping.tool.js';
