/**
 * Basic tests for AuthenticatedHttpClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthenticatedHttpClient } from '#ticktick_api/http/authenticated-http-client.js';
import { createMockLogger } from '#helpers/index.js';

describe('AuthenticatedHttpClient', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockGetAccessToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockGetAccessToken = vi.fn().mockResolvedValue('test-token');
  });

  it('should be instantiable', () => {
    const client = new AuthenticatedHttpClient(
      'https://api.ticktick.com',
      mockGetAccessToken,
      mockLogger,
      { retryCount: 0 }
    );
    expect(client).toBeDefined();
  });

  it('should construct with base URL', () => {
    const client = new AuthenticatedHttpClient(
      'https://api.ticktick.com',
      mockGetAccessToken,
      mockLogger
    );
    expect(client).toBeInstanceOf(AuthenticatedHttpClient);
  });
});
