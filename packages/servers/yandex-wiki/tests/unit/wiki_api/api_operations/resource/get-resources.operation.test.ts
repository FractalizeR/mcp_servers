// tests/unit/wiki_api/api_operations/resource/get-resources.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetResourcesOperation } from '#wiki_api/api_operations/resource/get-resources.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createResourcesResponseFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('GetResourcesOperation', () => {
  let operation: GetResourcesOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new GetResourcesOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен получить ресурсы страницы', async () => {
    const expectedResponse = createResourcesResponseFixture();
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedResponse);

    const result = await operation.execute({
      idx: 123,
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/123/resources', {});
    expect(result).toEqual(expectedResponse);
  });

  it('должен получить ресурсы с cursor', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createResourcesResponseFixture());

    await operation.execute({
      idx: 456,
      cursor: 'next-cursor-abc',
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/456/resources', {
      cursor: 'next-cursor-abc',
    });
  });

  it('должен получить ресурсы с сортировкой', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createResourcesResponseFixture());

    await operation.execute({
      idx: 789,
      order_by: 'name_title',
      order_direction: 'desc',
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/789/resources', {
      order_by: 'name_title',
      order_direction: 'desc',
    });
  });

  it('должен получить ресурсы с пагинацией', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createResourcesResponseFixture());

    await operation.execute({
      idx: 111,
      page_id: 2,
      page_size: 50,
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/111/resources', {
      page_id: 2,
      page_size: 50,
    });
  });

  it('должен получить ресурсы с поиском', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createResourcesResponseFixture());

    await operation.execute({
      idx: 222,
      q: 'search query',
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/222/resources', {
      q: 'search query',
    });
  });

  it('должен получить ресурсы с фильтром по типам', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createResourcesResponseFixture());

    await operation.execute({
      idx: 333,
      types: ['attachment', 'grid'],
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/333/resources', {
      types: 'attachment,grid',
    });
  });

  it('должен получить ресурсы со всеми параметрами', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createResourcesResponseFixture());

    await operation.execute({
      idx: 444,
      cursor: 'cursor-123',
      order_by: 'created_at',
      order_direction: 'asc',
      page_id: 3,
      page_size: 25,
      q: 'test',
      types: ['attachment'],
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/444/resources', {
      cursor: 'cursor-123',
      order_by: 'created_at',
      order_direction: 'asc',
      page_id: 3,
      page_size: 25,
      q: 'test',
      types: 'attachment',
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createResourcesResponseFixture());

    await operation.execute({
      idx: 555,
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Getting resources for page: 555');
  });

  it('должен игнорировать пустой массив types', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createResourcesResponseFixture());

    await operation.execute({
      idx: 666,
      types: [],
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/666/resources', {});
  });
});
