/**
 * Output DTO для операций с полями
 *
 * Используется как возвращаемый тип для:
 * - GetFieldOperation (GET /v3/fields/{fieldId})
 * - CreateFieldOperation (POST /v3/fields)
 * - UpdateFieldOperation (PATCH /v3/fields/{fieldId})
 */

import type { FieldWithUnknownFields } from '#tracker_api/entities/index.js';

/**
 * Output для одиночного поля
 *
 * Просто re-export из entities для консистентности с другими DTO модулями
 */
export type FieldOutput = FieldWithUnknownFields;
