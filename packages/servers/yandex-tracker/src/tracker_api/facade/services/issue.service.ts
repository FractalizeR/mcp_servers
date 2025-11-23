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
 * - Прямая инъекция операций через декораторы (@injectable + @inject)
 * - Нет зависимостей от других сервисов
 * - Делегирование вызовов операциям
 *
 * ВАЖНО: Использует декораторы InversifyJS для DI.
 * В отличие от Operations/Tools (ручная регистрация), новые сервисы
 * используют декораторы для более чистого и type-safe кода.
 */

import { injectable, inject } from 'inversify';
import { GetIssuesOperation } from '#tracker_api/api_operations/issue/get-issues.operation.js';
import { FindIssuesOperation } from '#tracker_api/api_operations/issue/find/find-issues.operation.js';
import { CreateIssueOperation } from '#tracker_api/api_operations/issue/create/create-issue.operation.js';
import { UpdateIssueOperation } from '#tracker_api/api_operations/issue/update/update-issue.operation.js';
import { GetIssueChangelogOperation } from '#tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.js';
import { GetIssueTransitionsOperation } from '#tracker_api/api_operations/issue/transitions/get-issue-transitions.operation.js';
import { TransitionIssueOperation } from '#tracker_api/api_operations/issue/transitions/transition-issue.operation.js';
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
  constructor(
    @inject(GetIssuesOperation) private readonly getIssuesOp: GetIssuesOperation,
    @inject(FindIssuesOperation) private readonly findIssuesOp: FindIssuesOperation,
    @inject(CreateIssueOperation) private readonly createIssueOp: CreateIssueOperation,
    @inject(UpdateIssueOperation) private readonly updateIssueOp: UpdateIssueOperation,
    @inject(GetIssueChangelogOperation)
    private readonly getIssueChangelogOp: GetIssueChangelogOperation,
    @inject(GetIssueTransitionsOperation)
    private readonly getIssueTransitionsOp: GetIssueTransitionsOperation,
    @inject(TransitionIssueOperation) private readonly transitionIssueOp: TransitionIssueOperation
  ) {}

  /**
   * Получает несколько задач параллельно
   * @param issueKeys - массив ключей задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssues(issueKeys: string[]): Promise<BatchIssueResult[]> {
    return this.getIssuesOp.execute(issueKeys);
  }

  /**
   * Ищет задачи по заданным критериям
   * @param params - параметры поиска (query/filter/keys/queue)
   * @returns массив найденных задач
   */
  async findIssues(params: FindIssuesInputDto): Promise<FindIssuesResult> {
    return this.findIssuesOp.execute(params);
  }

  /**
   * Создаёт новую задачу
   * @param issueData - данные задачи
   * @returns созданная задача
   */
  async createIssue(issueData: CreateIssueDto): Promise<IssueWithUnknownFields> {
    return this.createIssueOp.execute(issueData);
  }

  /**
   * Обновляет существующую задачу
   * @param issueKey - ключ задачи
   * @param updateData - данные для обновления
   * @returns обновлённая задача
   */
  async updateIssue(issueKey: string, updateData: UpdateIssueDto): Promise<IssueWithUnknownFields> {
    return this.updateIssueOp.execute(issueKey, updateData);
  }

  /**
   * Получает историю изменений задач (batch-режим)
   * @param issueKeys - массив ключей задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssueChangelog(issueKeys: string[]): Promise<BatchChangelogResult[]> {
    return this.getIssueChangelogOp.execute(issueKeys);
  }

  /**
   * Получает доступные переходы статусов для задачи
   * @param issueKey - ключ задачи
   * @returns массив доступных переходов
   */
  async getIssueTransitions(issueKey: string): Promise<TransitionWithUnknownFields[]> {
    return this.getIssueTransitionsOp.execute(issueKey);
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
    return this.transitionIssueOp.execute(issueKey, transitionId, transitionData);
  }
}
