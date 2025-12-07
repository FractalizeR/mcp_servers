/**
 * Validation of unique class names for DI registration
 *
 * Protection against name collisions in Dependency Injection system:
 * - Checks uniqueness of Tool and Operation class names
 * - Detects duplicates before application startup
 * - Prevents silent failures in DI container
 */

import { TOOL_CLASSES } from './definitions/tool-definitions.js';
import { OPERATION_DEFINITIONS } from './definitions/operation-definitions.js';

/**
 * Validate unique class names
 *
 * @param classes - Array of classes to check
 * @param type - Class type ('Tool' or 'Operation') for error message
 * @throws {Error} If duplicate names found
 */
export function validateUniqueClassNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classes: ReadonlyArray<new (...args: any[]) => any>,
  type: 'Tool' | 'Operation'
): void {
  const names = new Set<string>();
  const duplicates: string[] = [];

  for (const ClassDef of classes) {
    const name = ClassDef.name;
    if (names.has(name)) {
      duplicates.push(name);
    }
    names.add(name);
  }

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate ${type} class names detected: ${duplicates.join(', ')}. ` +
        `Each ${type} must have a unique name for DI registration.`
    );
  }
}

/**
 * Validate unique operation names from OPERATION_DEFINITIONS
 *
 * @throws {Error} If duplicate operation names found
 */
export function validateUniqueOperationNames(): void {
  const names = new Set<string>();
  const duplicates: string[] = [];

  for (const definition of OPERATION_DEFINITIONS) {
    const name = definition.operationClass.name;
    if (names.has(name)) {
      duplicates.push(name);
    }
    names.add(name);
  }

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate Operation class names detected: ${duplicates.join(', ')}. ` +
        `Each Operation must have a unique name for DI registration.`
    );
  }
}

/**
 * Validate all DI registrations
 *
 * Called when creating container to check uniqueness
 * of all Tool and Operation names.
 *
 * @throws {Error} If duplicate names found in Tools or Operations
 */
export function validateDIRegistrations(): void {
  validateUniqueClassNames(TOOL_CLASSES, 'Tool');
  validateUniqueOperationNames();
}
