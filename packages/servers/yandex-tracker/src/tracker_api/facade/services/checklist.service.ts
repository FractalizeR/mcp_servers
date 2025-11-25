/**
 * Checklist Service - сервис для работы с чеклистами задач
 *
 * Ответственность:
 * - Получение чеклиста задачи
 * - Добавление элемента в чеклист
 * - Обновление элемента чеклиста
 * - Удаление элемента из чеклиста
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
import { GetChecklistOperation } from '#tracker_api/api_operations/checklist/get-checklist.operation.js';
import { AddChecklistItemOperation } from '#tracker_api/api_operations/checklist/add-checklist-item.operation.js';
import { UpdateChecklistItemOperation } from '#tracker_api/api_operations/checklist/update-checklist-item.operation.js';
import { DeleteChecklistItemOperation } from '#tracker_api/api_operations/checklist/delete-checklist-item.operation.js';
import type { BatchResult } from '@mcp-framework/infrastructure';
import type { AddChecklistItemInput, UpdateChecklistItemInput } from '#tracker_api/dto/index.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';

@injectable()
export class ChecklistService {
  constructor(
    @inject(GetChecklistOperation)
    private readonly getChecklistOp: GetChecklistOperation,
    @inject(AddChecklistItemOperation)
    private readonly addChecklistItemOp: AddChecklistItemOperation,
    @inject(UpdateChecklistItemOperation)
    private readonly updateChecklistItemOp: UpdateChecklistItemOperation,
    @inject(DeleteChecklistItemOperation)
    private readonly deleteChecklistItemOp: DeleteChecklistItemOperation
  ) {}

  /**
   * Получает чеклист задачи
   * @param issueId - идентификатор или ключ задачи
   * @returns массив элементов чеклиста
   */
  async getChecklist(issueId: string): Promise<ChecklistItemWithUnknownFields[]> {
    return this.getChecklistOp.execute(issueId);
  }

  /**
   * Получает чеклисты для нескольких задач параллельно
   * @param issueIds - массив ключей или ID задач
   * @returns результаты batch-операции
   */
  async getChecklistMany(
    issueIds: string[]
  ): Promise<BatchResult<string, ChecklistItemWithUnknownFields[]>> {
    return this.getChecklistOp.executeMany(issueIds);
  }

  /**
   * Добавляет элемент в чеклист
   * @param issueId - идентификатор или ключ задачи
   * @param input - данные элемента
   * @returns созданный элемент чеклиста
   */
  async addChecklistItem(
    issueId: string,
    input: AddChecklistItemInput
  ): Promise<ChecklistItemWithUnknownFields> {
    return this.addChecklistItemOp.execute(issueId, input);
  }

  /**
   * Обновляет элемент чеклиста
   * @param issueId - идентификатор или ключ задачи
   * @param checklistItemId - идентификатор элемента чеклиста
   * @param input - новые данные элемента
   * @returns обновлённый элемент чеклиста
   */
  async updateChecklistItem(
    issueId: string,
    checklistItemId: string,
    input: UpdateChecklistItemInput
  ): Promise<ChecklistItemWithUnknownFields> {
    return this.updateChecklistItemOp.execute(issueId, checklistItemId, input);
  }

  /**
   * Удаляет элемент из чеклиста
   * @param issueId - идентификатор или ключ задачи
   * @param checklistItemId - идентификатор элемента чеклиста
   * @returns void
   */
  async deleteChecklistItem(issueId: string, checklistItemId: string): Promise<void> {
    return this.deleteChecklistItemOp.execute(issueId, checklistItemId);
  }
}
