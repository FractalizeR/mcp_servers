/**
 * Операция получения списка очередей в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка очередей с пагинацией
 * - Поддержка expand параметров
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v3/queues/
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { GetQueuesDto, QueuesListOutput } from '@tracker_api/dto/index.js';

export class GetQueuesOperation extends BaseOperation {
  /**
   * Получает список очередей с пагинацией
   *
   * @param params - параметры запроса (perPage, page, expand)
   * @returns массив очередей
   *
   * ВАЖНО:
   * - Поддерживает пагинацию (perPage, page)
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   * - expand позволяет получить дополнительные поля
   */
  async execute(params: GetQueuesDto = {}): Promise<QueuesListOutput> {
    const { perPage = 50, page = 1, expand } = params;

    this.logger.info(`Получение списка очередей (page=${page}, perPage=${perPage})`);

    const queryParams = new URLSearchParams();
    if (perPage) queryParams.append('perPage', perPage.toString());
    if (page) queryParams.append('page', page.toString());
    if (expand) queryParams.append('expand', expand);

    const endpoint = `/v3/queues/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const queues = await this.httpClient.get<QueuesListOutput>(endpoint);

    this.logger.info(`Получено ${queues.length} очередей`);

    return queues;
  }
}
