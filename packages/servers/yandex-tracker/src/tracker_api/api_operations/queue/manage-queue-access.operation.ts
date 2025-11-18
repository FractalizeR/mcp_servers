/**
 * Операция управления доступом к очереди в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО управление правами доступа к очереди
 * - Добавление/удаление пользователей из ролей
 * - НЕТ создания/обновления очередей
 *
 * API: PATCH /v3/queues/{queueId}/permissions
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { ManageQueueAccessDto, QueuePermissionsOutput } from '@tracker_api/dto/index.js';

export interface ManageQueueAccessParams {
  queueId: string;
  accessData: ManageQueueAccessDto;
}

export class ManageQueueAccessOperation extends BaseOperation {
  /**
   * Управляет правами доступа к очереди (добавление/удаление пользователей из ролей)
   *
   * @param params - параметры (queueId и accessData)
   * @returns массив прав доступа
   *
   * ВАЖНО:
   * - action='add' - добавляет пользователей в роль
   * - action='remove' - удаляет пользователей из роли
   * - Retry делается ТОЛЬКО в HttpClient.patch (нет двойного retry)
   */
  async execute(params: ManageQueueAccessParams): Promise<QueuePermissionsOutput> {
    const { queueId, accessData } = params;
    const { role, subjects, action } = accessData;

    this.logger.info(
      `${action === 'add' ? 'Добавление' : 'Удаление'} пользователей ${subjects.join(', ')} ` +
        `${action === 'add' ? 'в' : 'из'} роли ${role} для очереди ${queueId}`
    );

    // Формируем payload для PATCH запроса
    const payload = {
      [role]: {
        [action]: subjects,
      },
    };

    const permissions = await this.httpClient.patch<QueuePermissionsOutput>(
      `/v3/queues/${queueId}/permissions`,
      payload
    );

    this.logger.info(
      `Права доступа успешно обновлены для очереди ${queueId} (${action} ${subjects.length} пользователей)`
    );

    return permissions;
  }
}
