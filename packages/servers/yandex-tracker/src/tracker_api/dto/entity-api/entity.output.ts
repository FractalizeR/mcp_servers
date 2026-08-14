/**
 * Тип для ответа API при получении/создании/обновлении записи Entity API
 */

import type { EntityApiRecordWithUnknownFields } from '#tracker_api/entities/index.js';

/** Output для единичной записи Entity API */
export type EntityApiOutput = EntityApiRecordWithUnknownFields;
