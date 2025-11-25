import { TOOL_CLASSES } from './definitions/tool-definitions.js';
import { OPERATION_CLASSES } from './definitions/operation-definitions.js';

/**
 * Валидация уникальности имён классов в DI
 *
 * @throws {Error} если обнаружены дубликаты
 */
export function validateDIRegistrations(): void {
  const names = new Set<string>();

  for (const ToolClass of TOOL_CLASSES) {
    if (names.has(ToolClass.name)) {
      throw new Error(`[DI Validation Error] Duplicate tool class name: ${ToolClass.name}`);
    }
    names.add(ToolClass.name);
  }

  for (const OpClass of OPERATION_CLASSES) {
    if (names.has(OpClass.name)) {
      throw new Error(`[DI Validation Error] Duplicate operation class name: ${OpClass.name}`);
    }
    names.add(OpClass.name);
  }
}
