// tests/unit/wiki_api/facade/services/comment.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentService } from '../../../../../src/wiki_api/facade/services/comment.service.js';
import type {
  GetCommentsOperation,
  CreateCommentOperation,
  GetCommentThreadOperation,
  DeleteCommentOperation,
} from '../../../../../src/wiki_api/api_operations/index.js';
import {
  createCommentFixture,
  createCommentsResponseFixture,
} from '../../../../helpers/comment.fixture.js';

describe('CommentService', () => {
  let service: CommentService;
  let mockGetComments: GetCommentsOperation;
  let mockCreateComment: CreateCommentOperation;
  let mockGetCommentThread: GetCommentThreadOperation;
  let mockDeleteComment: DeleteCommentOperation;

  beforeEach(() => {
    mockGetComments = { execute: vi.fn() } as unknown as GetCommentsOperation;
    mockCreateComment = { execute: vi.fn() } as unknown as CreateCommentOperation;
    mockGetCommentThread = { execute: vi.fn() } as unknown as GetCommentThreadOperation;
    mockDeleteComment = { execute: vi.fn() } as unknown as DeleteCommentOperation;

    service = new CommentService(
      mockGetComments,
      mockCreateComment,
      mockGetCommentThread,
      mockDeleteComment
    );
  });

  describe('getComments', () => {
    it('должен делегировать вызов GetCommentsOperation', async () => {
      const expected = createCommentsResponseFixture();
      vi.mocked(mockGetComments.execute).mockResolvedValue(expected);

      const params = { idx: 123 };
      const result = await service.getComments(params);

      expect(mockGetComments.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(expected);
    });
  });

  describe('createComment', () => {
    it('должен делегировать вызов CreateCommentOperation', async () => {
      const expected = createCommentFixture();
      vi.mocked(mockCreateComment.execute).mockResolvedValue(expected);

      const data = { body: 'Hi' };
      const result = await service.createComment(123, data);

      expect(mockCreateComment.execute).toHaveBeenCalledWith(123, data);
      expect(result).toBe(expected);
    });
  });

  describe('getCommentThread', () => {
    it('должен делегировать вызов GetCommentThreadOperation', async () => {
      const expected = createCommentsResponseFixture();
      vi.mocked(mockGetCommentThread.execute).mockResolvedValue(expected);

      const params = { idx: 123, comment_id: 501 };
      const result = await service.getCommentThread(params);

      expect(mockGetCommentThread.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(expected);
    });
  });

  describe('deleteComment', () => {
    it('должен делегировать вызов DeleteCommentOperation', async () => {
      const expected = { comments_count: 3 };
      vi.mocked(mockDeleteComment.execute).mockResolvedValue(expected);

      const result = await service.deleteComment(123, 501);

      expect(mockDeleteComment.execute).toHaveBeenCalledWith(123, 501);
      expect(result).toBe(expected);
    });
  });
});
