/**
 * Issue Service - сервис для работы с задачами
 *
 * Ответственность:
 * - Получение задач (batch и search)
 * - Создание и обновление задач
 * - Получение истории изменений
 * - Получение и выполнение переходов статусов
 *
 * Архитектура:
 * - Инъекция операций через IssueOperationsContainer (Parameter Object pattern)
 * - Нет зависимостей от других сервисов
 * - Делегирование вызовов операциям
 *
 * ВАЖНО: Использует декораторы InversifyJS для DI.
 */

import { injectable, inject } from 'inversify';
import { IssueOperationsContainer } from './containers/index.js';
import type { BatchIssueResult } from '#tracker_api/api_operations/issue/get-issues.operation.js';
import type { BatchChangelogResult } from '#tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.js';
import type { FindIssuesResult } from '#tracker_api/api_operations/issue/find/index.js';
import type {
  FindIssuesInputDto,
  CreateIssueDto,
  UpdateIssueDto,
  ExecuteTransitionDto,
} from '#tracker_api/dto/index.js';
import type {
  IssueWithUnknownFields,
  TransitionWithUnknownFields,
} from '#tracker_api/entities/index.js';

@injectable()
export class IssueService {
  constructor(@inject(IssueOperationsContainer) private readonly ops: IssueOperationsContainer) {}

  /**
   * Получает несколько задач параллельно
   * @param issueKeys - массив ключей задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssues(issueKeys: string[]): Promise<BatchIssueResult[]> {
    return this.ops.getIssues.execute(issueKeys);
  }

  /**
   * Ищет задачи по заданным критериям
   * @param params - параметры поиска (query/filter/keys/queue)
   * @returns массив найденных задач
   */
  async findIssues(params: FindIssuesInputDto): Promise<FindIssuesResult> {
    return this.ops.findIssues.execute(params);
  }

  /**
   * Создаёт новую задачу
   * @param issueData - данные задачи
   * @returns созданная задача
   */
  async createIssue(issueData: CreateIssueDto): Promise<IssueWithUnknownFields> {
    return this.ops.createIssue.execute(issueData);
  }

  /**
   * Обновляет существующую задачу
   * @param issueKey - ключ задачи
   * @param updateData - данные для обновления
   * @returns обновлённая задача
   */
  async updateIssue(issueKey: string, updateData: UpdateIssueDto): Promise<IssueWithUnknownFields> {
    return this.ops.updateIssue.execute(issueKey, updateData);
  }

  /**
   * Получает историю изменений задач (batch-режим)
   * @param issueKeys - массив ключей задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssueChangelog(issueKeys: string[]): Promise<BatchChangelogResult[]> {
    return this.ops.getIssueChangelog.execute(issueKeys);
  }

  /**
   * Получает доступные переходы статусов для задачи
   * @param issueKey - ключ задачи
   * @returns массив доступных переходов
   */
  async getIssueTransitions(issueKey: string): Promise<TransitionWithUnknownFields[]> {
    return this.ops.getIssueTransitions.execute(issueKey);
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
    return this.ops.transitionIssue.execute(issueKey, transitionId, transitionData);
  }
}
