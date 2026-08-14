import { BaseOperation } from '../base-operation.js';
import type { CreateCommentDto } from '#wiki_api/dto/index.js';
import type { Comment } from '#wiki_api/entities/index.js';

export class CreateCommentOperation extends BaseOperation {
  async execute(idx: number, data: CreateCommentDto): Promise<Comment> {
    this.logger.info(`Creating comment on page: ${idx}`);

    return this.httpClient.post<Comment>(`/v1/pages/${idx}/comments`, data);
  }
}
