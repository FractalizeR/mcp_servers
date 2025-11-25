import { BaseOperation } from '../base-operation.js';

export interface DeleteGridResult {
  recovery_token: string;
}

export class DeleteGridOperation extends BaseOperation {
  async execute(idx: string): Promise<DeleteGridResult> {
    this.logger.info(`Deleting grid: ${idx}`);

    return this.deleteRequest<DeleteGridResult>(`/v1/grids/${idx}`);
  }
}
