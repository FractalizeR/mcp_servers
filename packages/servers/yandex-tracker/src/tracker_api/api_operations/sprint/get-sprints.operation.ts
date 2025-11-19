/**
 * Операция получения списка спринтов доски в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка спринтов конкретной доски
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v2/boards/{boardId}/sprints
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { SprintsListOutput } from '@tracker_api/dto/index.js';

export interface GetSprintsParams {
  /** ID доски, для которой получаем спринты */
  boardId: string;
}

export class GetSprintsOperation extends BaseOperation {
  /**
   * Получает список спринтов доски
   *
   * @param params - параметры запроса (boardId)
   * @returns массив спринтов
   *
   * ВАЖНО:
   * - Результат НЕ кешируется (список спринтов может часто изменяться)
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   */
  async execute(params: GetSprintsParams): Promise<SprintsListOutput> {
    const { boardId } = params;

    this.logger.info(`Получение спринтов доски: ${boardId}`);

    const endpoint = `/v2/boards/${boardId}/sprints`;

    const sprints = await this.httpClient.get<SprintsListOutput>(endpoint);

    this.logger.info(`Получено спринтов: ${sprints.length}`);

    return sprints;
  }
}
