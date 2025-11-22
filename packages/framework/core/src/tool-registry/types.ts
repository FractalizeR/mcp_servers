/**
 * Типы для ToolRegistry
 */

import type { BaseTool } from '../tools/base/index.js';
import { ToolPriority } from '../tools/base/tool-metadata.js';

/**
 * Конструктор класса Tool для DI
 */
export interface ToolConstructor {
  new (...args: any[]): BaseTool<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  name: string;
}

/**
 * Порядок приоритетов (меньше значение = выше приоритет)
 */
export const PRIORITY_ORDER: Record<string, number> = {
  [ToolPriority.CRITICAL]: 0,
  [ToolPriority.HIGH]: 1,
  [ToolPriority.NORMAL]: 2,
  [ToolPriority.LOW]: 3,
};
