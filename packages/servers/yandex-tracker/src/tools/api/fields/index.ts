/**
 * Экспорты для Global Fields API tools (пакет 7.2.E)
 *
 * ВАЖНО: это ГЛОБАЛЬНЫЕ поля Трекера (`/v3/fields`), видимые во всей
 * организации — НЕ путать с ЛОКАЛЬНЫМИ полями очереди
 * (`#tools/api/queue-local-fields`), у которых своя схема тела запроса и
 * своя адресация (короткий `key`, а не `fieldId`).
 */

export { GetGlobalFieldsTool } from './get-global-fields.tool.js';
export {
  GetGlobalFieldsParamsSchema,
  type GetGlobalFieldsParams,
} from './get-global-fields.schema.js';

export { GetGlobalFieldTool } from './get-global-field.tool.js';
export {
  GetGlobalFieldParamsSchema,
  type GetGlobalFieldParams,
} from './get-global-field.schema.js';

export { CreateGlobalFieldTool } from './create-global-field.tool.js';
export {
  CreateGlobalFieldParamsSchema,
  type CreateGlobalFieldParams,
} from './create-global-field.schema.js';

export { UpdateGlobalFieldTool } from './update-global-field.tool.js';
export {
  UpdateGlobalFieldParamsSchema,
  type UpdateGlobalFieldParams,
} from './update-global-field.schema.js';
