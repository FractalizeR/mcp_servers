import { injectable, inject } from 'inversify';
import { GetResourcesOperation } from '#wiki_api/api_operations/index.js';
import type { GetResourcesParams } from '#wiki_api/api_operations/index.js';
import type { ResourcesResponse } from '#wiki_api/entities/index.js';

@injectable()
export class ResourceService {
  constructor(
    @inject(GetResourcesOperation) private readonly getResourcesOp: GetResourcesOperation
  ) {}

  async getResources(params: GetResourcesParams): Promise<ResourcesResponse> {
    return this.getResourcesOp.execute(params);
  }
}
