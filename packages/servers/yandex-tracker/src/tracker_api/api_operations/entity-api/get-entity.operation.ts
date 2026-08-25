/**
 * Операция получения одной записи Entity API (Goal/Project/Portfolio)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение одной записи по entityType+id
 * - НЕТ поиска/создания/обновления/удаления
 *
 * API: GET /v3/entities/{entityType}/{id}
 *
 * ВАЖНО: не путать с legacy-коллекцией `/v3/projects/{id}` (`GetProjectOperation`) —
 * `entityType='project'` здесь адресует Project ВНУТРИ Entity API, другую
 * коллекцию с другим пространством идентификаторов. «Legacy» — про коллекцию
 * (более старый REST-ресурс), а не про версию пути: обе коллекции теперь на v3.
 *
 * ФОРМА ОТВЕТА: живьём отдельно не проверялась (проверялся только `_search`,
 * см. `find-entities.operation.ts` — там голая гипотеза референсного клиента
 * не подтвердилась). Здесь `response.data` не парсится структурно, поэтому
 * рассинхронизация формы тихо портила бы данные вместо явного падения —
 * `assertEntityRecordShape` ловит хотя бы известный уже класс путаницы
 * (конверт поиска `{hits,pages,values}` вместо одной записи) и любую форму
 * без `id`, не угадывая при этом новую альтернативную форму.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { GetEntityDto } from '#tracker_api/dto/entity-api/index.js';
import type { EntityApiOutput } from '#tracker_api/dto/entity-api/index.js';
import { assertEntityRecordShape } from './assert-entity-record-shape.util.js';
import { buildEntityQuery } from './entity-query.util.js';

export class GetEntityOperation extends BaseOperation {
  async execute(dto: GetEntityDto): Promise<EntityApiOutput> {
    const { entityType, entityId, entityFields } = dto;
    this.logger.info(`Получение записи Entity API: ${entityType}/${entityId}`);

    const data = await this.httpClient.get<unknown>(
      `/v3/entities/${entityType}/${entityId}${buildEntityQuery({ entityFields })}`
    );
    return assertEntityRecordShape<EntityApiOutput>(data, `get_entity ${entityType}/${entityId}`);
  }
}
