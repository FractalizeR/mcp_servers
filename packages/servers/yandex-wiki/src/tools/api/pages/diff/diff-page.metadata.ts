/**
 * Метаданные для DiffPageTool (пакет 3.1.E).
 *
 * Вынесен из Apps-трека плана модернизации: построчный diff не требует MCP
 * Apps — обычный read-only инструмент, сравнивающий текущее содержимое
 * страницы с предлагаемым новым, работает во всех клиентах (включая Codex) и
 * закрывает риск незаметной порчи страницы агентом перед вызовом update_page.
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const DIFF_PAGE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('diff_page', MCP_TOOL_PREFIX),
  description: '[Pages/Read] Сравнить страницу с предлагаемым содержимым, ничего не изменяя',
  category: ToolCategory.PAGES,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['read', 'diff', 'compare', 'page', 'wiki', 'preview'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx'],
} as const;
