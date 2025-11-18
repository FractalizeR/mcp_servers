/**
 * Output DTO для списка компонентов очереди
 *
 * API: GET /v2/queues/{queueId}/components
 */

import type { ComponentWithUnknownFields } from '../../entities/component.entity.js';

/**
 * Список компонентов очереди
 *
 * Возвращается из API как массив компонентов.
 * В отличие от других API, компоненты не поддерживают пагинацию на уровне API.
 */
export type ComponentsListOutput = readonly ComponentWithUnknownFields[];
