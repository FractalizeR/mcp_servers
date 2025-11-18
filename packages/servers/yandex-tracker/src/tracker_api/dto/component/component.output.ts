/**
 * Output DTO для одного компонента
 *
 * Используется в responses:
 * - POST /v2/queues/{queueId}/components (создание)
 * - PATCH /v2/components/{componentId} (обновление)
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
