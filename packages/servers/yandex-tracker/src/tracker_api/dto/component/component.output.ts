/**
 * Output DTO для одного компонента
 *
 * Используется в responses:
 * - POST /v3/components (создание)
 * - PATCH /v3/components/{componentId} (обновление)
 *
 * DELETE не возвращает тело ответа (только 204 No Content)
 */

import type { ComponentWithUnknownFields } from '../../entities/component.entity.js';

/**
 * Компонент очереди (ответ API)
 *
 * Возвращается при создании, обновлении или получении компонента.
 */
export type ComponentOutput = ComponentWithUnknownFields;
