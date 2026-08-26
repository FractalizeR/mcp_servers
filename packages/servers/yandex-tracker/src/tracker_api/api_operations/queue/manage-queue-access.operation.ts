/**
 * Операция управления доступом к очереди в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО управление правами доступа к очереди
 * - Добавление/удаление субъектов (пользователей/групп/ролей) из разрешений
 * - НЕТ создания/обновления очередей
 *
 * API: PATCH /v3/queues/{queueId}/permissions
 * Тело — `{ <разрешение>: { <вид субъекта>: { <действие>: [субъекты] } } }`
 * (api-ref/queues/manage-access, раздел «Параметры тела запроса»).
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { ManageQueueAccessDto, QueuePermissionsOutput } from '#tracker_api/dto/index.js';

export interface ManageQueueAccessParams {
  queueId: string;
  accessData: ManageQueueAccessDto;
}

export class ManageQueueAccessOperation extends BaseOperation {
  /**
   * Управляет правами доступа к очереди (добавление/удаление субъектов из разрешения)
   *
   * @param params - параметры (queueId и accessData)
   * @returns права доступа очереди
   *
   * ВАЖНО:
   * - action='add' - добавляет субъекты в разрешение
   * - action='remove' - удаляет субъекты из разрешения
   * - Retry делается ТОЛЬКО в HttpClient.patch (нет двойного retry)
   */
  async execute(params: ManageQueueAccessParams): Promise<QueuePermissionsOutput> {
    const { queueId, accessData } = params;
    const { permission, subjectKind, subjects, action } = accessData;

    this.logger.info(
      `${action === 'add' ? 'Добавление' : 'Удаление'} субъектов ${subjects.join(', ')} ` +
        `(${subjectKind}) для разрешения ${permission} очереди ${queueId}`
    );

    // Формируем payload для PATCH запроса: { [разрешение]: { [вид субъекта]: { [действие]: [субъекты] } } }
    const payload = {
      [permission]: {
        [subjectKind]: {
          [action]: subjects,
        },
      },
    };

    const permissions = await this.httpClient.patch<QueuePermissionsOutput>(
      `/v3/queues/${queueId}/permissions`,
      payload
    );

    this.logger.info(
      `Права доступа успешно обновлены для очереди ${queueId} (${action} ${subjects.length} субъектов)`
    );

    return permissions;
  }
}
