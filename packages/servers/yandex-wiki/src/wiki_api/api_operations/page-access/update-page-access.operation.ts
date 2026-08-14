import { BaseOperation } from '../base-operation.js';
import type { UpdatePageAccessDto } from '#wiki_api/dto/index.js';
import type { PageAccess } from '#wiki_api/entities/index.js';

export interface UpdatePageAccessParams {
  idx: number;
  access_id: string;
  data: UpdatePageAccessDto;
  /** Query-параметр Wiki API: не дать оставить со-автора без доступа/прав на управление доступом */
  prevent_selflock?: boolean;
}

export class UpdatePageAccessOperation extends BaseOperation {
  async execute(params: UpdatePageAccessParams): Promise<PageAccess> {
    const queryString =
      params.prevent_selflock !== undefined ? `?prevent_selflock=${params.prevent_selflock}` : '';

    this.logger.info(`Updating page access ${params.access_id} on page: ${params.idx}`);

    return this.httpClient.post<PageAccess>(
      `/v1/pages/${params.idx}/access/${params.access_id}${queryString}`,
      params.data
    );
  }
}
