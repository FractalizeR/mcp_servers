import { BaseOperation } from '../base-operation.js';

export interface DeleteAllPageAccessesParams {
  idx: number;
  prevent_selflock?: boolean;
}

export class DeleteAllPageAccessesOperation extends BaseOperation {
  async execute(params: DeleteAllPageAccessesParams): Promise<void> {
    const queryString =
      params.prevent_selflock !== undefined ? `?prevent_selflock=${params.prevent_selflock}` : '';

    this.logger.info(`Deleting ALL personal page accesses on page: ${params.idx}`);

    return this.deleteRequest<void>(`/v1/pages/${params.idx}/access${queryString}`);
  }
}
