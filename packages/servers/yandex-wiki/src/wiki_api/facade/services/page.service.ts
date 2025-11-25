import { injectable, inject } from 'inversify';
import {
  GetPageOperation,
  GetPageByIdOperation,
  CreatePageOperation,
  UpdatePageOperation,
  DeletePageOperation,
  ClonePageOperation,
  AppendContentOperation,
} from '#wiki_api/api_operations/index.js';
import type {
  GetPageParams,
  GetPageByIdParams,
  CreatePageParams,
  UpdatePageParams,
  AppendContentParams,
  DeletePageResult,
} from '#wiki_api/api_operations/index.js';
import type { PageWithUnknownFields, AsyncOperation } from '#wiki_api/entities/index.js';
import type { ClonePageDto } from '#wiki_api/dto/index.js';

@injectable()
export class PageService {
  constructor(
    @inject(GetPageOperation) private readonly getPageOp: GetPageOperation,
    @inject(GetPageByIdOperation) private readonly getPageByIdOp: GetPageByIdOperation,
    @inject(CreatePageOperation) private readonly createPageOp: CreatePageOperation,
    @inject(UpdatePageOperation) private readonly updatePageOp: UpdatePageOperation,
    @inject(DeletePageOperation) private readonly deletePageOp: DeletePageOperation,
    @inject(ClonePageOperation) private readonly clonePageOp: ClonePageOperation,
    @inject(AppendContentOperation) private readonly appendContentOp: AppendContentOperation
  ) {}

  async getPage(params: GetPageParams): Promise<PageWithUnknownFields> {
    return this.getPageOp.execute(params);
  }

  async getPageById(params: GetPageByIdParams): Promise<PageWithUnknownFields> {
    return this.getPageByIdOp.execute(params);
  }

  async createPage(params: CreatePageParams): Promise<PageWithUnknownFields> {
    return this.createPageOp.execute(params);
  }

  async updatePage(params: UpdatePageParams): Promise<PageWithUnknownFields> {
    return this.updatePageOp.execute(params);
  }

  async deletePage(idx: number): Promise<DeletePageResult> {
    return this.deletePageOp.execute(idx);
  }

  async clonePage(idx: number, data: ClonePageDto): Promise<AsyncOperation> {
    return this.clonePageOp.execute(idx, data);
  }

  async appendContent(params: AppendContentParams): Promise<PageWithUnknownFields> {
    return this.appendContentOp.execute(params);
  }
}
