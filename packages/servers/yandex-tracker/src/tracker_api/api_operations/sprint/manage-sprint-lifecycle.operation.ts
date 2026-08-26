/**
 * Операция управления жизненным циклом спринта (старт/архивация/удаление)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО lifecycle-переходы спринта, НЕ обновление name/dates/status
 *   (для этого — `UpdateSprintOperation`/`update_sprint`)
 *
 * API:
 * - start:   POST /v3/sprints/{id}/_start?version={version}
 * - archive: POST /v3/sprints/{id}/_archive?version={version}
 * - delete:  DELETE /v3/sprints/{id}
 *
 * Источник форм запроса — официальная документация (`api-ref/boards/
 * start-sprint.md`/`archive-sprint.md`/`delete-sprint.md`): референсный
 * клиент lifecycle-методов для Sprints НЕ содержит (только generic
 * update/delete на базовом `Collection`), поэтому пути взяты из доки.
 *
 * `version` у `_start`/`_archive` обязателен — без него API отвечает `428`
 * (живая проба 2026-08-26), ровно как у `PATCH /v3/sprints/{id}`. `delete`
 * версию не требует и не шлёт — лишний GET для её чтения был бы платой ни за что.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { readCurrentVersion } from '#tracker_api/api_operations/read-current-version.util.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { ManageSprintLifecycleDto, SprintOutput } from '#tracker_api/dto/index.js';

export class ManageSprintLifecycleOperation extends BaseOperation {
  /**
   * @returns обновлённый спринт для start/archive; `null` для delete
   *   (эндпоинт возвращает 204 без тела)
   */
  async execute(dto: ManageSprintLifecycleDto): Promise<SprintOutput | null> {
    const { sprintId, action, version } = dto;
    this.logger.info(`Управление жизненным циклом спринта ${sprintId}: ${action}`);

    const cacheKey = EntityCacheKey.createKey(EntityType.SPRINT, sprintId);

    let result: SprintOutput | null;
    switch (action) {
      case 'start': {
        const effectiveVersion =
          version ??
          (await readCurrentVersion(
            this.httpClient,
            `/v3/sprints/${sprintId}`,
            sprintId,
            'спринта'
          ));
        result = await this.httpClient.post<SprintOutput>(
          `/v3/sprints/${sprintId}/_start?version=${effectiveVersion}`
        );
        break;
      }
      case 'archive': {
        const effectiveVersion =
          version ??
          (await readCurrentVersion(
            this.httpClient,
            `/v3/sprints/${sprintId}`,
            sprintId,
            'спринта'
          ));
        result = await this.httpClient.post<SprintOutput>(
          `/v3/sprints/${sprintId}/_archive?version=${effectiveVersion}`
        );
        break;
      }
      case 'delete':
        await this.httpClient.delete<void>(`/v3/sprints/${sprintId}`);
        result = null;
        break;
    }

    await this.cacheManager.delete(cacheKey);
    return result;
  }
}
