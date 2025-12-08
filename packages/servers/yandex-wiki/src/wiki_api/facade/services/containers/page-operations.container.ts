/**
 * Page Operations Container
 *
 * Groups all page operations for PageService.
 * Reduces constructor parameters from 7 to 1.
 *
 * Pattern: Parameter Object
 */

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

@injectable()
export class PageOperationsContainer {
  constructor(
    @inject(GetPageOperation) readonly getPage: GetPageOperation,
    @inject(GetPageByIdOperation) readonly getPageById: GetPageByIdOperation,
    @inject(CreatePageOperation) readonly createPage: CreatePageOperation,
    @inject(UpdatePageOperation) readonly updatePage: UpdatePageOperation,
    @inject(DeletePageOperation) readonly deletePage: DeletePageOperation,
    @inject(ClonePageOperation) readonly clonePage: ClonePageOperation,
    @inject(AppendContentOperation) readonly appendContent: AppendContentOperation
  ) {}
}
