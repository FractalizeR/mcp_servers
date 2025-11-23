/**
 * Issue Link Service - сервис для работы со связями между задачами
 *
 * Ответственность:
 * - Получение связей задачи
 * - Создание связей между задачами
 * - Удаление связей
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
import {
  GetIssueLinksOperation,
  type BatchIssueLinksResult,
} from '#tracker_api/api_operations/link/get-issue-links.operation.js';
import { CreateLinkOperation } from '#tracker_api/api_operations/link/create-link.operation.js';
import { DeleteLinkOperation } from '#tracker_api/api_operations/link/delete-link.operation.js';
import type { LinkWithUnknownFields, LinkRelationship } from '#tracker_api/entities/link.entity.js';
import type { CreateLinkDto } from '#tracker_api/dto/link/create-link.dto.js';
import type { BatchResult } from '@mcp-framework/infrastructure';

@injectable()
export class IssueLinkService {
  constructor(
    @inject(GetIssueLinksOperation) private readonly getLinksOp: GetIssueLinksOperation,
    @inject(CreateLinkOperation) private readonly createOp: CreateLinkOperation,
    @inject(DeleteLinkOperation) private readonly deleteOp: DeleteLinkOperation
  ) {}

  /**
   * Получает связи для нескольких задач параллельно
   * @param issueIds - массив ключей или ID задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssueLinks(issueIds: string[]): Promise<BatchIssueLinksResult[]> {
    return this.getLinksOp.execute(issueIds);
  }

  /**
   * Создаёт связь между текущей и указанной задачей
   * @param issueId - ключ или ID текущей задачи
   * @param linkData - параметры связи (relationship и issue)
   * @returns созданная связь
   */
  async createLink(issueId: string, linkData: CreateLinkDto): Promise<LinkWithUnknownFields> {
    return this.createOp.execute(issueId, linkData);
  }

  /**
   * Создаёт связи для нескольких задач параллельно
   * @param links - массив связей с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   */
  async createLinksMany(
    links: Array<{ issueId: string; relationship: LinkRelationship; targetIssue: string }>
  ): Promise<BatchResult<string, LinkWithUnknownFields>> {
    return this.createOp.executeMany(links);
  }

  /**
   * Удаляет связь между задачами
   * @param issueId - ключ или ID задачи
   * @param linkId - ID связи для удаления
   */
  async deleteLink(issueId: string, linkId: string): Promise<void> {
    return this.deleteOp.execute(issueId, linkId);
  }
}
