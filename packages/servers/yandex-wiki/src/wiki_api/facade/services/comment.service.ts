/**
 * Comment Service — комментарии к странице (пакет 7.2.D).
 *
 * Ответственность: делегирование вызовов операциям комментариев. 4 операции —
 * прямая инъекция (как ResourceService/SearchService), отдельный
 * OperationsContainer не заводится (порог, после которого он оправдан, —
 * см. PageOperationsContainer с 9 инъекциями).
 */

import { injectable, inject } from 'inversify';
import {
  GetCommentsOperation,
  CreateCommentOperation,
  GetCommentThreadOperation,
  DeleteCommentOperation,
} from '#wiki_api/api_operations/index.js';
import type { GetCommentsParams, GetCommentThreadParams } from '#wiki_api/api_operations/index.js';
import type { CreateCommentDto } from '#wiki_api/dto/index.js';
import type { Comment, CommentsResponse, DeleteCommentResult } from '#wiki_api/entities/index.js';

@injectable()
export class CommentService {
  constructor(
    @inject(GetCommentsOperation) private readonly getCommentsOp: GetCommentsOperation,
    @inject(CreateCommentOperation) private readonly createCommentOp: CreateCommentOperation,
    @inject(GetCommentThreadOperation)
    private readonly getCommentThreadOp: GetCommentThreadOperation,
    @inject(DeleteCommentOperation) private readonly deleteCommentOp: DeleteCommentOperation
  ) {}

  async getComments(params: GetCommentsParams): Promise<CommentsResponse> {
    return this.getCommentsOp.execute(params);
  }

  async createComment(idx: number, data: CreateCommentDto): Promise<Comment> {
    return this.createCommentOp.execute(idx, data);
  }

  async getCommentThread(params: GetCommentThreadParams): Promise<CommentsResponse> {
    return this.getCommentThreadOp.execute(params);
  }

  async deleteComment(idx: number, commentId: number): Promise<DeleteCommentResult> {
    return this.deleteCommentOp.execute(idx, commentId);
  }
}
