/**
 * Операция добавления записи времени к задаче
 *
 * Ответственность (SRP):
 * - ТОЛЬКО добавление записи времени к задаче (single и batch режимы)
 * - Конвертация human-readable duration в ISO 8601
 * - Параллельное выполнение через ParallelExecutor (batch режим)
 * - НЕТ получения/редактирования/удаления записей
 *
 * API: POST /v2/issues/{issueId}/worklog
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import { DurationUtil } from '#tracker_api/utils/duration.util.js';
import type { AddWorklogInput } from '#tracker_api/dto/index.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';

export class AddWorklogOperation extends BaseOperation {
  private readonly parallelExecutor: ParallelExecutor;

  constructor(
    httpClient: ConstructorParameters<typeof BaseOperation>[0],
    cacheManager: ConstructorParameters<typeof BaseOperation>[1],
    logger: ConstructorParameters<typeof BaseOperation>[2],
    config: ServerConfig
  ) {
    super(httpClient, cacheManager, logger);

    this.parallelExecutor = new ParallelExecutor(logger, {
      maxBatchSize: config.maxBatchSize,
      maxConcurrentRequests: config.maxConcurrentRequests,
    });
  }
  /**
   * Добавляет запись времени к задаче
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param input - данные записи времени
   * @returns созданная запись времени
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.post
   * - API возвращает полный объект записи времени
   * - duration автоматически конвертируется в ISO 8601, если передан в human-readable формате
   * - Эндпоинт из API v2 (не v3!)
   */
  async execute(issueId: string, input: AddWorklogInput): Promise<WorklogWithUnknownFields> {
    this.logger.info(`Добавление записи времени к задаче ${issueId}`);

    // Подготовка payload - конвертация duration если нужно
    const payload = {
      ...input,
      // Конвертируем duration в ISO 8601, если это human-readable формат
      duration: DurationUtil.isValidIsoDuration(input.duration)
        ? input.duration
        : DurationUtil.parseHumanReadable(input.duration),
    };

    this.logger.debug(`Payload для API:`, {
      issueId,
      start: payload.start,
      duration: payload.duration,
      hasComment: !!payload.comment,
    });

    const worklog = await this.httpClient.post<WorklogWithUnknownFields>(
      `/v2/issues/${issueId}/worklog`,
      payload
    );

    this.logger.info(`Запись времени успешно добавлена к задаче ${issueId}: ${worklog.id}`);

    return worklog;
  }

  /**
   * Добавляет записи времени к нескольким задачам параллельно
   *
   * @param worklogs - массив записей времени с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   * @throws {Error} если количество задач превышает maxBatchSize
   *
   * ВАЖНО:
   * - Каждая задача имеет свои параметры (start, duration, comment)
   * - Использует ParallelExecutor для соблюдения maxConcurrentRequests
   * - Retry делается автоматически в HttpClient.post
   */
  async executeMany(
    worklogs: Array<{
      issueId: string;
      start: string;
      duration: string;
      comment?: string | undefined;
    }>
  ): Promise<BatchResult<string, WorklogWithUnknownFields>> {
    // Проверка на пустой массив
    if (worklogs.length === 0) {
      this.logger.warn('AddWorklogOperation: пустой массив записей времени');
      return [];
    }

    this.logger.info(
      `Добавление записей времени к ${worklogs.length} задачам параллельно: ${worklogs.map((w) => w.issueId).join(', ')}`
    );

    // Создаём операции для каждой задачи
    const operations = worklogs.map(({ issueId, start, duration, comment }) => ({
      key: issueId,
      fn: async (): Promise<WorklogWithUnknownFields> => {
        // Вызываем существующий метод execute() для каждой задачи с индивидуальными параметрами
        return this.execute(issueId, { start, duration, comment });
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'add worklogs');
  }
}
