// tests/unit/wiki_api/facade/services/resource.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceService } from '../../../../../src/wiki_api/facade/services/resource.service.js';
import type { GetResourcesOperation } from '../../../../../src/wiki_api/api_operations/index.js';
import { createResourcesResponseFixture } from '../../../../helpers/resource.fixture.js';

describe('ResourceService', () => {
  let resourceService: ResourceService;
  let mockGetResourcesOp: GetResourcesOperation;

  beforeEach(() => {
    mockGetResourcesOp = {
      execute: vi.fn(),
    } as unknown as GetResourcesOperation;

    resourceService = new ResourceService(mockGetResourcesOp);
  });

  describe('getResources', () => {
    it('должен делегировать вызов GetResourcesOperation', async () => {
      const mockResponse = createResourcesResponseFixture();
      vi.mocked(mockGetResourcesOp.execute).mockResolvedValue(mockResponse);

      const params = { idx: 'page-123' };
      const result = await resourceService.getResources(params);

      expect(mockGetResourcesOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResponse);
    });

    it('должен передавать параметры с полями', async () => {
      const mockResponse = createResourcesResponseFixture();
      vi.mocked(mockGetResourcesOp.execute).mockResolvedValue(mockResponse);

      const params = { idx: 'page-456', fields: 'url,name' };
      const result = await resourceService.getResources(params);

      expect(mockGetResourcesOp.execute).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResponse);
    });

    it('должен пробрасывать ошибки из операции', async () => {
      const error = new Error('API error');
      vi.mocked(mockGetResourcesOp.execute).mockRejectedValue(error);

      const params = { idx: 'page-789' };

      await expect(resourceService.getResources(params)).rejects.toThrow('API error');
    });
  });
});
