import { BaseOperation } from '../base-operation.js';

export interface DeletePageResult {
  recovery_token: string;
}

export class DeletePageOperation extends BaseOperation {
  async execute(idx: number): Promise<DeletePageResult> {
    this.logger.info(`Deleting page: ${idx}`);

    return this.deleteRequest<DeletePageResult>(`/v1/pages/${idx}`);
  }
}
