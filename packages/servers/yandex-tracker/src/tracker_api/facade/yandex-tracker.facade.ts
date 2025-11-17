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
import type {
  FindIssuesInputDto,
  CreateIssueDto,
  UpdateIssueDto,
  ExecuteTransitionDto,
} from '@tracker_api/dto/index.js';
import type {
  IssueWithUnknownFields,
  ChangelogEntryWithUnknownFields,
  TransitionWithUnknownFields,
} from '@tracker_api/entities/index.js';

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

  // === Issue Methods - Create/Update ===

  /**
   * Создаёт новую задачу
   * @param issueData - данные задачи
   * @returns созданная задача
   */
  async createIssue(issueData: CreateIssueDto): Promise<IssueWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (data: CreateIssueDto) => Promise<IssueWithUnknownFields>;
    }>('CreateIssueOperation');
    return operation.execute(issueData);
  }

  /**
   * Обновляет существующую задачу
   * @param issueKey - ключ задачи
   * @param updateData - данные для обновления
   * @returns обновлённая задача
   */
  async updateIssue(issueKey: string, updateData: UpdateIssueDto): Promise<IssueWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (key: string, data: UpdateIssueDto) => Promise<IssueWithUnknownFields>;
    }>('UpdateIssueOperation');
    return operation.execute(issueKey, updateData);
  }

  // === Issue Methods - Changelog ===

  /**
   * Получает историю изменений задачи
   * @param issueKey - ключ задачи
   * @returns массив записей истории
   */
  async getIssueChangelog(issueKey: string): Promise<ChangelogEntryWithUnknownFields[]> {
    const operation = this.getOperation<{
      execute: (key: string) => Promise<ChangelogEntryWithUnknownFields[]>;
    }>('GetIssueChangelogOperation');
    return operation.execute(issueKey);
  }

  // === Issue Methods - Transitions ===

  /**
   * Получает доступные переходы статусов для задачи
   * @param issueKey - ключ задачи
   * @returns массив доступных переходов
   */
  async getIssueTransitions(issueKey: string): Promise<TransitionWithUnknownFields[]> {
    const operation = this.getOperation<{
      execute: (key: string) => Promise<TransitionWithUnknownFields[]>;
    }>('GetIssueTransitionsOperation');
    return operation.execute(issueKey);
  }

  /**
   * Выполняет переход задачи в другой статус
   * @param issueKey - ключ задачи
   * @param transitionId - идентификатор перехода
   * @param transitionData - дополнительные данные (опционально)
   * @returns обновлённая задача
   */
  async transitionIssue(
    issueKey: string,
    transitionId: string,
    transitionData?: ExecuteTransitionDto
  ): Promise<IssueWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (
        key: string,
        id: string,
        data?: ExecuteTransitionDto
      ) => Promise<IssueWithUnknownFields>;
    }>('TransitionIssueOperation');
    return operation.execute(issueKey, transitionId, transitionData);
  }
}
