/**
 * Фасад для работы с API Яндекс.Трекера
 *
 * Ответственность (SRP):
 * - ТОЛЬКО делегирование вызовов операциям
 * - НЕТ бизнес-логики (всё в операциях)
 * - НЕТ ручной инициализации (извлекается из DI контейнера)
 *
 * КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ:
 * - Ленивая инициализация через DI контейнер (вместо new)
 * - Масштабируется до 50+ операций БЕЗ изменения Facade
 * - Удалён двойной retry (исправлена проблема 9 попыток)
 *
 * Паттерн: Facade Pattern + Lazy Initialization
 */

import type { Container } from 'inversify';

// Types
import type { PingResult } from '@tracker_api/api_operations/user/ping.operation.js';
import type { BatchIssueResult } from '@tracker_api/api_operations/issue/get-issues.operation.js';
import type { FindIssuesResult } from '@tracker_api/api_operations/issue/find/index.js';
import type { FindIssuesInputDto } from '@tracker_api/dto/index.js';

export class YandexTrackerFacade {
  constructor(private readonly container: Container) {}

  /**
   * Helper для ленивого получения операции из DI контейнера
   * @private
   */
  private getOperation<T>(operationName: string): T {
    return this.container.get<T>(Symbol.for(operationName));
  }

  // === User Methods ===

  /**
   * Проверяет подключение к API Яндекс.Трекера
   * @returns результат проверки
   */
  async ping(): Promise<PingResult> {
    const operation = this.getOperation<{ execute: () => Promise<PingResult> }>('PingOperation');
    return operation.execute();
  }

  // === Issue Methods - Batch ===

  /**
   * Получает несколько задач параллельно
   * @param issueKeys - массив ключей задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssues(issueKeys: string[]): Promise<BatchIssueResult[]> {
    const operation = this.getOperation<{
      execute: (keys: string[]) => Promise<BatchIssueResult[]>;
    }>('GetIssuesOperation');
    return operation.execute(issueKeys);
  }

  // === Issue Methods - Search ===

  /**
   * Ищет задачи по заданным критериям
   * @param params - параметры поиска (query/filter/keys/queue)
   * @returns массив найденных задач
   */
  async findIssues(params: FindIssuesInputDto): Promise<FindIssuesResult> {
    const operation = this.getOperation<{
      execute: (params: FindIssuesInputDto) => Promise<FindIssuesResult>;
    }>('FindIssuesOperation');
    return operation.execute(params);
  }
}
