/**
 * MCP Prompts — публичный API (пакет 5.1.A плана модернизации, зеркалирует
 * ../resources/index.ts).
 */

export type {
  PromptProvider,
  PromptGetResult,
  McpPrompt,
  McpPromptArgument,
  McpPromptMessage,
  McpPromptMessageContent,
  McpPromptTextContent,
} from './prompt-provider.js';
export { PromptRegistry } from './prompt-registry.js';
