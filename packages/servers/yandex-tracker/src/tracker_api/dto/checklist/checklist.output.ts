/**
 * Output types для операций с чеклистами
 */

import type { ChecklistItemWithUnknownFields } from '../../entities/index.js';

/**
 * Результат операции с одним элементом чеклиста
 * (Add, Update, Get single)
 */
export type ChecklistItemOutput = ChecklistItemWithUnknownFields;

/**
 * Результат операции получения чеклиста
 * (Get all checklist items)
 */
export type ChecklistOutput = ChecklistItemWithUnknownFields[];
