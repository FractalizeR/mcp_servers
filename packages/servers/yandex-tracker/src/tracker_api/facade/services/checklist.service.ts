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
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import type { AddChecklistItemInput, UpdateChecklistItemInput } from '#tracker_api/dto/index.js';
import type { GetChecklistInput } from '#tracker_api/dto/checklist/get-checklist.dto.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';

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
   * Получает чеклист задачи (с пагинацией)
   * @param input - задача + опциональные параметры пагинации
   * @returns `PaginatedResult` с элементами чеклиста и метаданными
   */
  async getChecklist(
    input: GetChecklistInput
  ): Promise<PaginatedResult<ChecklistItemWithUnknownFields>> {
    return this.getChecklistOp.execute(input);
  }

  /**
   * Получает чеклисты для нескольких задач параллельно (с пагинацией)
   * @param issueIds - массив ключей или ID задач
   * @param options - общие параметры пагинации (применяются ко всем задачам)
   * @returns результаты batch-операции с `PaginatedResult` в каждой задаче
   */
  async getChecklistMany(
    issueIds: string[],
    options: Omit<GetChecklistInput, 'issueId'> = {}
  ): Promise<BatchResult<string, PaginatedResult<ChecklistItemWithUnknownFields>>> {
    return this.getChecklistOp.executeMany(issueIds, options);
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
   * Добавляет элементы в чеклисты нескольких задач параллельно
   * @param items - массив элементов с индивидуальными параметрами
   * @returns результаты batch-операции
   */
  async addChecklistItemMany(
    items: Array<{
      issueId: string;
      text: string;
      checked?: boolean | undefined;
      assignee?: string | undefined;
      deadline?: string | undefined;
    }>
  ): Promise<BatchResult<string, ChecklistItemWithUnknownFields>> {
    return this.addChecklistItemOp.executeMany(items);
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
   * Обновляет элементы чеклистов нескольких задач параллельно
   * @param items - массив элементов с индивидуальными параметрами
   * @returns результаты batch-операции
   */
  async updateChecklistItemMany(
    items: Array<{
      issueId: string;
      checklistItemId: string;
      text?: string | undefined;
      checked?: boolean | undefined;
      assignee?: string | undefined;
      deadline?: string | undefined;
    }>
  ): Promise<BatchResult<string, ChecklistItemWithUnknownFields>> {
    return this.updateChecklistItemOp.executeMany(items);
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

  /**
   * Удаляет элементы из чеклистов нескольких задач параллельно
   * @param items - массив элементов для удаления с индивидуальными параметрами
   * @returns результаты batch-операции
   */
  async deleteChecklistItemMany(
    items: Array<{ issueId: string; itemId: string }>
  ): Promise<BatchResult<string, void>> {
    return this.deleteChecklistItemOp.executeMany(items);
  }
}
