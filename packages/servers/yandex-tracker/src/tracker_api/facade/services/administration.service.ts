/**
 * Administration Service - справочники Трекера (типы задач/статусы/резолюции/приоритеты)
 *
 * Ответственность:
 * - READ-only доступ к глобальным справочникам, которые нужны агенту, чтобы
 *   не угадывать ключи `type`/`status`/`resolution`/`priority` при
 *   create_issue/update_issue/transition_issue/bulk_*
 *
 * Архитектура: прямая инъекция операций через декораторы, без зависимостей
 * от других сервисов.
 */

import { injectable, inject } from 'inversify';
import {
  GetIssueTypesOperation,
  GetStatusesOperation,
  GetResolutionsOperation,
  GetPrioritiesOperation,
} from '#tracker_api/api_operations/administration/index.js';
import type {
  IssueTypeWithUnknownFields,
  StatusWithUnknownFields,
  ResolutionWithUnknownFields,
  PriorityWithUnknownFields,
  PaginatedResult,
} from '#tracker_api/entities/index.js';

@injectable()
export class AdministrationService {
  constructor(
    @inject(GetIssueTypesOperation) private readonly getIssueTypesOp: GetIssueTypesOperation,
    @inject(GetStatusesOperation) private readonly getStatusesOp: GetStatusesOperation,
    @inject(GetResolutionsOperation) private readonly getResolutionsOp: GetResolutionsOperation,
    @inject(GetPrioritiesOperation) private readonly getPrioritiesOp: GetPrioritiesOperation
  ) {}

  async getIssueTypes(): Promise<PaginatedResult<IssueTypeWithUnknownFields>> {
    return this.getIssueTypesOp.execute();
  }

  async getStatuses(): Promise<PaginatedResult<StatusWithUnknownFields>> {
    return this.getStatusesOp.execute();
  }

  async getResolutions(): Promise<PaginatedResult<ResolutionWithUnknownFields>> {
    return this.getResolutionsOp.execute();
  }

  async getPriorities(): Promise<PaginatedResult<PriorityWithUnknownFields>> {
    return this.getPrioritiesOp.execute();
  }
}
