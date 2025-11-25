/**
 * Worklog Service - сервис для работы с записями времени задач
 *
 * Ответственность:
 * - Получение списка записей времени задачи
 * - Добавление записи времени к задаче
 * - Обновление записи времени
 * - Удаление записи времени
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
import { GetWorklogsOperation } from '#tracker_api/api_operations/worklog/get-worklogs.operation.js';
import { AddWorklogOperation } from '#tracker_api/api_operations/worklog/add-worklog.operation.js';
import { UpdateWorklogOperation } from '#tracker_api/api_operations/worklog/update-worklog.operation.js';
import { DeleteWorklogOperation } from '#tracker_api/api_operations/worklog/delete-worklog.operation.js';
import type { AddWorklogInput, UpdateWorklogInput } from '#tracker_api/dto/index.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure';

@injectable()
export class WorklogService {
  constructor(
    @inject(GetWorklogsOperation)
    private readonly getWorklogsOp: GetWorklogsOperation,
    @inject(AddWorklogOperation)
    private readonly addWorklogOp: AddWorklogOperation,
    @inject(UpdateWorklogOperation)
    private readonly updateWorklogOp: UpdateWorklogOperation,
    @inject(DeleteWorklogOperation)
    private readonly deleteWorklogOp: DeleteWorklogOperation
  ) {}

  /**
   * Получает список записей времени задачи
   * @param issueId - идентификатор или ключ задачи
   * @returns массив записей времени
   */
  async getWorklogs(issueId: string): Promise<WorklogWithUnknownFields[]> {
    return this.getWorklogsOp.execute(issueId);
  }

  /**
   * Получает записи времени для нескольких задач параллельно
   * @param issueIds - массив идентификаторов задач
   * @returns результаты в формате BatchResult
   */
  async getWorklogsMany(
    issueIds: string[]
  ): Promise<BatchResult<string, WorklogWithUnknownFields[]>> {
    return this.getWorklogsOp.executeMany(issueIds);
  }

  /**
   * Добавляет запись времени к задаче
   * @param issueId - идентификатор или ключ задачи
   * @param input - данные записи времени
   * @returns созданная запись времени
   */
  async addWorklog(issueId: string, input: AddWorklogInput): Promise<WorklogWithUnknownFields> {
    return this.addWorklogOp.execute(issueId, input);
  }

  /**
   * Добавляет записи времени к нескольким задачам параллельно
   * @param worklogs - массив записей времени с индивидуальными параметрами
   * @returns результаты в формате BatchResult
   */
  async addWorklogsMany(
    worklogs: Array<{
      issueId: string;
      start: string;
      duration: string;
      comment?: string | undefined;
    }>
  ): Promise<BatchResult<string, WorklogWithUnknownFields>> {
    return this.addWorklogOp.executeMany(worklogs);
  }

  /**
   * Обновляет запись времени
   * @param issueId - идентификатор или ключ задачи
   * @param worklogId - идентификатор записи времени
   * @param input - новые данные записи времени
   * @returns обновлённая запись времени
   */
  async updateWorklog(
    issueId: string,
    worklogId: string,
    input: UpdateWorklogInput
  ): Promise<WorklogWithUnknownFields> {
    return this.updateWorklogOp.execute(issueId, worklogId, input);
  }

  /**
   * Удаляет запись времени
   * @param issueId - идентификатор или ключ задачи
   * @param worklogId - идентификатор записи времени
   * @returns void
   */
  async deleteWorklog(issueId: string, worklogId: string): Promise<void> {
    return this.deleteWorklogOp.execute(issueId, worklogId);
  }
}
