// tests/unit/wiki_api/facade/services/page-access.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageAccessService } from '../../../../../src/wiki_api/facade/services/page-access.service.js';
import type {
  CreatePageAccessOperation,
  UpdatePageAccessOperation,
  DeletePageAccessOperation,
  DeleteAllPageAccessesOperation,
} from '../../../../../src/wiki_api/api_operations/index.js';
import { createPageAccessFixture } from '../../../../helpers/page-access.fixture.js';

describe('PageAccessService', () => {
  let service: PageAccessService;
  let mockCreate: CreatePageAccessOperation;
  let mockUpdate: UpdatePageAccessOperation;
  let mockDelete: DeletePageAccessOperation;
  let mockDeleteAll: DeleteAllPageAccessesOperation;

  beforeEach(() => {
    mockCreate = { execute: vi.fn() } as unknown as CreatePageAccessOperation;
    mockUpdate = { execute: vi.fn() } as unknown as UpdatePageAccessOperation;
    mockDelete = { execute: vi.fn() } as unknown as DeletePageAccessOperation;
    mockDeleteAll = { execute: vi.fn() } as unknown as DeleteAllPageAccessesOperation;

    service = new PageAccessService(mockCreate, mockUpdate, mockDelete, mockDeleteAll);
  });

  describe('createPageAccess', () => {
    it('должен делегировать вызов CreatePageAccessOperation', async () => {
      const expected = createPageAccessFixture();
      vi.mocked(mockCreate.execute).mockResolvedValue(expected);

      const data = { role: 'reader' as const, user: { uid: 'u1' } };
      const result = await service.createPageAccess(123, data);

      expect(mockCreate.execute).toHaveBeenCalledWith(123, data);
      expect(result).toBe(expected);
    });
  });

  describe('updatePageAccess', () => {
    it('должен делегировать вызов UpdatePageAccessOperation', async () => {
      const expected = createPageAccessFixture();
      vi.mocked(mockUpdate.execute).mockResolvedValue(expected);

      const params = { idx: 123, access_id: 'a1', data: { role: 'editor' as const } };
      const result = await service.updatePageAccess(params);

      expect(mockUpdate.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(expected);
    });
  });

  describe('deletePageAccess', () => {
    it('должен делегировать вызов DeletePageAccessOperation', async () => {
      vi.mocked(mockDelete.execute).mockResolvedValue(undefined);

      const params = { idx: 123, access_id: 'a1' };
      await service.deletePageAccess(params);

      expect(mockDelete.execute).toHaveBeenCalledWith(params);
    });
  });

  describe('deleteAllPageAccesses', () => {
    it('должен делегировать вызов DeleteAllPageAccessesOperation', async () => {
      vi.mocked(mockDeleteAll.execute).mockResolvedValue(undefined);

      const params = { idx: 123 };
      await service.deleteAllPageAccesses(params);

      expect(mockDeleteAll.execute).toHaveBeenCalledWith(params);
    });
  });
});
