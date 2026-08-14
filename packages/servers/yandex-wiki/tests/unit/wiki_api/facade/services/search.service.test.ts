// tests/unit/wiki_api/facade/services/search.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from '../../../../../src/wiki_api/facade/services/search.service.js';
import type { SearchOperation } from '../../../../../src/wiki_api/api_operations/search/search.operation.js';
import { createSearchResponseFixture } from '../../../../helpers/search.fixture.js';

describe('SearchService', () => {
  let searchService: SearchService;
  let mockSearchOp: SearchOperation;

  beforeEach(() => {
    mockSearchOp = { execute: vi.fn() } as unknown as SearchOperation;
    searchService = new SearchService(mockSearchOp);
  });

  describe('search', () => {
    it('должен делегировать вызов SearchOperation', async () => {
      const mockResponse = createSearchResponseFixture();
      vi.mocked(mockSearchOp.execute).mockResolvedValue(mockResponse);

      const data = { query: 'test' };
      const result = await searchService.search(data);

      expect(mockSearchOp.execute).toHaveBeenCalledWith(data);
      expect(result).toBe(mockResponse);
    });
  });
});
