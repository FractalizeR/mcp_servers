import { BaseOperation } from '../base-operation.js';

export interface DeletePageAccessParams {
  idx: number;
  access_id: string;
  prevent_selflock?: boolean;
}

export class DeletePageAccessOperation extends BaseOperation {
  async execute(params: DeletePageAccessParams): Promise<void> {
    const queryString =
      params.prevent_selflock !== undefined ? `?prevent_selflock=${params.prevent_selflock}` : '';

    this.logger.info(`Deleting page access ${params.access_id} on page: ${params.idx}`);

    return this.deleteRequest<void>(
      `/v1/pages/${params.idx}/access/${params.access_id}${queryString}`
    );
  }
}
