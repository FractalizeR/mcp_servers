import { BaseOperation } from '../base-operation.js';

/**
 * Ответ DELETE /v1/grids/{id}. Проверено живым запросом (2026-08-14,
 * см. inventory/table5-wiki-api-coverage.md, «Результаты проверки гипотез»,
 * дефект №3): API отдаёт только `message`, поля `recovery_token` в ответе
 * нет — в отличие от удаления страницы, удаление таблицы необратимо.
 */
export interface DeleteGridResult {
  message?: string;
}

export class DeleteGridOperation extends BaseOperation {
  async execute(idx: string): Promise<DeleteGridResult> {
    this.logger.info(`Deleting grid: ${idx}`);

    return this.deleteRequest<DeleteGridResult>(`/v1/grids/${idx}`);
  }
}
