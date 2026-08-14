import { injectable, inject } from 'inversify';
import { PageOperationsContainer } from './containers/page-operations.container.js';
import type {
  GetPageParams,
  GetPageByIdParams,
  CreatePageParams,
  UpdatePageParams,
  AppendContentParams,
  DeletePageParams,
  DeletePageResult,
  GetDescendantsByIdParams,
  GetDescendantsBySlugParams,
} from '#wiki_api/api_operations/index.js';
import type {
  PageWithUnknownFields,
  AsyncOperation,
  PageDescendantsResponse,
} from '#wiki_api/entities/index.js';
import type { ClonePageDto } from '#wiki_api/dto/index.js';

@injectable()
export class PageService {
  constructor(@inject(PageOperationsContainer) private readonly ops: PageOperationsContainer) {}

  async getPage(params: GetPageParams): Promise<PageWithUnknownFields> {
    return this.ops.getPage.execute(params);
  }

  async getPageById(params: GetPageByIdParams): Promise<PageWithUnknownFields> {
    return this.ops.getPageById.execute(params);
  }

  async createPage(params: CreatePageParams): Promise<PageWithUnknownFields> {
    return this.ops.createPage.execute(params);
  }

  async updatePage(params: UpdatePageParams): Promise<PageWithUnknownFields> {
    return this.ops.updatePage.execute(params);
  }

  async deletePage(params: DeletePageParams): Promise<DeletePageResult> {
    return this.ops.deletePage.execute(params);
  }

  async clonePage(idx: number, data: ClonePageDto): Promise<AsyncOperation> {
    return this.ops.clonePage.execute(idx, data);
  }

  async appendContent(params: AppendContentParams): Promise<PageWithUnknownFields> {
    return this.ops.appendContent.execute(params);
  }

  async getDescendantsById(params: GetDescendantsByIdParams): Promise<PageDescendantsResponse> {
    return this.ops.getDescendantsById.execute(params);
  }

  async getDescendantsBySlug(params: GetDescendantsBySlugParams): Promise<PageDescendantsResponse> {
    return this.ops.getDescendantsBySlug.execute(params);
  }
}
