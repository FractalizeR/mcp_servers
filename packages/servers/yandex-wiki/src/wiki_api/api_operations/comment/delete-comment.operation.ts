import { BaseOperation } from '../base-operation.js';
import type { DeleteCommentResult } from '#wiki_api/entities/index.js';

export class DeleteCommentOperation extends BaseOperation {
  async execute(idx: number, commentId: number): Promise<DeleteCommentResult> {
    this.logger.info(`Deleting comment ${commentId} on page: ${idx}`);

    return this.deleteRequest<DeleteCommentResult>(`/v1/pages/${idx}/comments/${commentId}`);
  }
}
