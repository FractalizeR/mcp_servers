/**
 * Операция обновления спринта в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление существующего спринта
 * - Инвалидация кеша после обновления
 * - НЕТ создания/получения/удаления
 *
 * API: PATCH /v3/sprints/{sprintId}?version={version}
 *
 * ВАЖНО:
 * - Все поля тела опциональны (частичное обновление)
 * - Версия обязательна: без неё API отвечает 428 и правка не проходит вовсе
 *   (живая проба 2026-08-26); версией в ТЕЛЕ API тоже недоволен —
 *   `400 version: Incorrect data format`. Рабочая форма — query-параметр,
 *   как у `UpdateComponentOperation` после его починки.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { readCurrentVersion } from '#tracker_api/api_operations/read-current-version.util.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { UpdateSprintDto, SprintOutput } from '#tracker_api/dto/index.js';

export class UpdateSprintOperation extends BaseOperation {
  /**
   * Обновляет существующий спринт
   *
   * @param sprintId - ID спринта для обновления
   * @param data - данные для обновления (все поля опциональны)
   * @param version - версия для оптимистичной блокировки; не передана — операция
   *   читает текущую версию сама (`readCurrentVersion`, `read-current-version.util.ts`)
   * @returns обновлённый спринт
   *
   * ВАЖНО:
   * - После обновления инвалидируется кеш спринта
   * - Retry делается ТОЛЬКО в HttpClient.patch (нет двойного retry)
   */
  async execute(sprintId: string, data: UpdateSprintDto, version?: number): Promise<SprintOutput> {
    this.logger.info(`Обновление спринта: ${sprintId}`);

    // `version` уходит query-параметром, не телом: гарантия нужна и на уровне
    // операции, не только у вызывающего инструмента (`update-sprint.tool.ts`) —
    // `UpdateSprintDto` несёт индексную сигнатуру `[key: string]: unknown`, и без
    // деструктуризации вызов операции напрямую с версией в данных отправил бы её
    // телом (`PATCH /v3/sprints/{id}` отвечает на это `400 version: Incorrect data
    // format`).
    const { version: _ignoredBodyVersion, ...body } = data;

    const effectiveVersion =
      version ??
      (await readCurrentVersion(this.httpClient, `/v3/sprints/${sprintId}`, sprintId, 'спринта'));

    const sprint = await this.httpClient.patch<SprintOutput>(
      `/v3/sprints/${sprintId}?version=${effectiveVersion}`,
      body
    );

    const cacheKey = EntityCacheKey.createKey(EntityType.SPRINT, String(sprint.id));
    await this.cacheManager.delete(cacheKey);

    this.logger.info(`Спринт обновлен: ${sprint.id}`);

    return sprint;
  }
}
