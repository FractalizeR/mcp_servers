/**
 * Field filtering utility for TickTick tools
 *
 * Wraps ResponseFieldFilter with empty array handling:
 * - Empty array = return all fields
 * - Non-empty array = filter to specified fields
 */

import { ResponseFieldFilter } from '@fractalizer/mcp-core';

/**
 * Filter object/array to specified fields
 *
 * @param data - Data to filter
 * @param fields - Fields to include (empty = all fields)
 * @returns Filtered data
 */
export function filterFields<T>(data: T, fields: string[]): T {
  // Empty array means "return all fields"
  if (fields.length === 0) {
    return data;
  }

  return ResponseFieldFilter.filter(data, fields);
}

/**
 * Filter array of objects to specified fields
 *
 * @param items - Array of objects to filter
 * @param fields - Fields to include (empty = all fields)
 * @returns Filtered array
 */
export function filterFieldsArray<T>(items: T[], fields: string[]): T[] {
  if (fields.length === 0) {
    return items;
  }

  return items.map((item) => ResponseFieldFilter.filter(item, fields));
}
