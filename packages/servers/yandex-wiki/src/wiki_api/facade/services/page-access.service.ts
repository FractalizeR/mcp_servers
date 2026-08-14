/**
 * Page Access Service — права доступа к странице (пакет 7.2.D). Только
 * запись: в документированной части API нет эндпоинта чтения списка
 * доступов (см. заголовок `page-access.entity.ts`).
 */

import { injectable, inject } from 'inversify';
import {
  CreatePageAccessOperation,
  UpdatePageAccessOperation,
  DeletePageAccessOperation,
  DeleteAllPageAccessesOperation,
} from '#wiki_api/api_operations/index.js';
import type {
  UpdatePageAccessParams,
  DeletePageAccessParams,
  DeleteAllPageAccessesParams,
} from '#wiki_api/api_operations/index.js';
import type { CreatePageAccessDto } from '#wiki_api/dto/index.js';
import type { PageAccess } from '#wiki_api/entities/index.js';

@injectable()
export class PageAccessService {
  constructor(
    @inject(CreatePageAccessOperation)
    private readonly createPageAccessOp: CreatePageAccessOperation,
    @inject(UpdatePageAccessOperation)
    private readonly updatePageAccessOp: UpdatePageAccessOperation,
    @inject(DeletePageAccessOperation)
    private readonly deletePageAccessOp: DeletePageAccessOperation,
    @inject(DeleteAllPageAccessesOperation)
    private readonly deleteAllPageAccessesOp: DeleteAllPageAccessesOperation
  ) {}

  async createPageAccess(idx: number, data: CreatePageAccessDto): Promise<PageAccess> {
    return this.createPageAccessOp.execute(idx, data);
  }

  async updatePageAccess(params: UpdatePageAccessParams): Promise<PageAccess> {
    return this.updatePageAccessOp.execute(params);
  }

  async deletePageAccess(params: DeletePageAccessParams): Promise<void> {
    return this.deletePageAccessOp.execute(params);
  }

  async deleteAllPageAccesses(params: DeleteAllPageAccessesParams): Promise<void> {
    return this.deleteAllPageAccessesOp.execute(params);
  }
}
