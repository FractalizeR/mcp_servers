/**
 * Unit tests for RawApiRequestOperation (TickTick)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RawApiRequestOperation } from '#ticktick_api/api_operations/raw/raw-api-request.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('RawApiRequestOperation', () => {
  let operation: RawApiRequestOperation;
  let mockHttpClient: IHttpClient;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    operation = new RawApiRequestOperation(
      mockHttpClient,
      createMockCacheManager(),
      createMockLogger()
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('request', () => {
    it('should proxy GET to httpClient with path and query', async () => {
      const payload = { id: 'proj-1' };
      vi.mocked(mockHttpClient.get).mockResolvedValue(payload);

      const result = await operation.request({
        method: 'GET',
        path: '/project/proj-1/data',
        query: { limit: 50, status: 'active' },
      });

      expect(result).toBe(payload);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/project/proj-1/data', {
        limit: 50,
        status: 'active',
      });
    });

    it('should work without query (passes undefined)', async () => {
      await operation.request({ method: 'GET', path: '/project' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/project', undefined);
    });

    it('should serialize array query into comma-separated values', async () => {
      await operation.request({
        method: 'GET',
        path: '/project/proj-1/data',
        query: { tags: ['urgent', 'home'] },
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/project/proj-1/data', {
        tags: 'urgent,home',
      });
    });

    it('should normalize mixed query (array + scalars) without altering scalars', async () => {
      await operation.request({
        method: 'GET',
        path: '/project/proj-1/data',
        query: { tags: ['a'], limit: 10, active: true, name: 'x' },
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/project/proj-1/data', {
        tags: 'a',
        limit: 10,
        active: true,
        name: 'x',
      });
    });

    it('should propagate httpClient error', async () => {
      vi.mocked(mockHttpClient.get).mockRejectedValue(new Error('boom'));

      await expect(operation.request({ method: 'GET', path: '/project' })).rejects.toThrow('boom');
    });

    it('should throw on unsupported method (guard)', async () => {
      await expect(
        // @ts-expect-error — intentionally unsupported method to check guard
        operation.request({ method: 'DELETE', path: '/project/proj-1' })
      ).rejects.toThrow('Unsupported raw API method');
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });
  });
});
