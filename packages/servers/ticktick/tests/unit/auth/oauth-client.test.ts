/**
 * Unit tests for TickTickOAuthClient
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { TickTickOAuthClient } from '../../../src/ticktick_api/auth/oauth-client.js';
import type { OAuthConfig } from '../../../src/config/server-config.interface.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('TickTickOAuthClient', () => {
  const baseConfig: OAuthConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/callback',
  };

  describe('constructor', () => {
    it('should initialize without tokens', () => {
      const client = new TickTickOAuthClient(baseConfig);
      expect(client.isAuthenticated()).toBe(false);
    });

    it('should initialize with accessToken from config', () => {
      const config: OAuthConfig = {
        ...baseConfig,
        accessToken: 'test-access-token',
      };
      const client = new TickTickOAuthClient(config);
      expect(client.isAuthenticated()).toBe(true);
    });

    it('should initialize with both tokens from config', () => {
      const config: OAuthConfig = {
        ...baseConfig,
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      };
      const client = new TickTickOAuthClient(config);
      expect(client.isAuthenticated()).toBe(true);
    });
  });

  describe('getAuthorizationUrl', () => {
    let client: TickTickOAuthClient;

    beforeEach(() => {
      client = new TickTickOAuthClient(baseConfig);
    });

    it('should generate authorization URL with default scopes', () => {
      const url = client.getAuthorizationUrl();

      expect(url).toContain('https://ticktick.com/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=tasks%3Aread+tasks%3Awrite');
    });

    it('should generate authorization URL with custom scopes', () => {
      const url = client.getAuthorizationUrl(['tasks:read']);

      expect(url).toContain('scope=tasks%3Aread');
      expect(url).not.toContain('tasks%3Awrite');
    });

    it('should include state parameter when provided', () => {
      const url = client.getAuthorizationUrl(['tasks:read'], 'csrf-token-123');

      expect(url).toContain('state=csrf-token-123');
    });
  });

  describe('getAccessToken', () => {
    it('should throw if not authenticated', async () => {
      const client = new TickTickOAuthClient(baseConfig);

      await expect(client.getAccessToken()).rejects.toThrow(
        'Not authenticated. Call authenticate() first or provide accessToken in config.'
      );
    });

    it('should return access token if authenticated', async () => {
      const config: OAuthConfig = {
        ...baseConfig,
        accessToken: 'test-access-token',
      };
      const client = new TickTickOAuthClient(config);

      const token = await client.getAccessToken();
      expect(token).toBe('test-access-token');
    });
  });

  describe('getTokenPair', () => {
    it('should return null when not authenticated', () => {
      const client = new TickTickOAuthClient(baseConfig);
      expect(client.getTokenPair()).toBeNull();
    });

    it('should return token pair when authenticated', () => {
      const config: OAuthConfig = {
        ...baseConfig,
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      };
      const client = new TickTickOAuthClient(config);

      const tokenPair = client.getTokenPair();
      expect(tokenPair).not.toBeNull();
      expect(tokenPair?.accessToken).toBe('test-access-token');
      expect(tokenPair?.refreshToken).toBe('test-refresh-token');
    });
  });

  describe('setTokenPair', () => {
    it('should set token pair and become authenticated', () => {
      const client = new TickTickOAuthClient(baseConfig);
      expect(client.isAuthenticated()).toBe(false);

      client.setTokenPair({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 3600000,
      });

      expect(client.isAuthenticated()).toBe(true);
      expect(client.getTokenPair()?.accessToken).toBe('new-access-token');
    });
  });

  describe('refreshAccessToken', () => {
    afterEach(() => {
      mockedAxios.post.mockReset();
    });

    it('should throw when there is no refresh token (never authenticated)', async () => {
      const client = new TickTickOAuthClient(baseConfig);
      await expect(client.refreshAccessToken()).rejects.toThrow(
        'No refresh token available. Re-authentication required.'
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should throw when authenticated via accessToken only (no refresh token provided)', async () => {
      const config: OAuthConfig = { ...baseConfig, accessToken: 'access-only' };
      const client = new TickTickOAuthClient(config);
      await expect(client.refreshAccessToken()).rejects.toThrow(
        'No refresh token available. Re-authentication required.'
      );
    });

    it('should exchange the refresh token for a new access token and update state', async () => {
      const client = new TickTickOAuthClient(baseConfig);
      client.setTokenPair({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        expiresAt: Date.now() + 1000,
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          token_type: 'bearer',
          expires_in: 3600,
        },
      });

      await client.refreshAccessToken();

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, body, options] = mockedAxios.post.mock.calls[0] as [
        string,
        string,
        { headers: Record<string, string> },
      ];
      expect(url).toBe('https://ticktick.com/oauth/token');
      expect(body).toContain('grant_type=refresh_token');
      expect(body).toContain('client_id=test-client-id');
      expect(body).toContain('refresh_token=old-refresh');
      expect(options).toMatchObject({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const tokenPair = client.getTokenPair();
      expect(tokenPair?.accessToken).toBe('new-access');
      expect(tokenPair?.refreshToken).toBe('new-refresh');
    });

    it('should keep the previous refresh token when the response omits a new one', async () => {
      const client = new TickTickOAuthClient(baseConfig);
      client.setTokenPair({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        expiresAt: Date.now() + 1000,
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'new-access', token_type: 'bearer' },
      });

      await client.refreshAccessToken();

      expect(client.getTokenPair()?.refreshToken).toBe('old-refresh');
    });

    it('should use the default ~6 month lifetime when expires_in is absent', async () => {
      const client = new TickTickOAuthClient(baseConfig);
      client.setTokenPair({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        expiresAt: Date.now() + 1000,
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'new-access', token_type: 'bearer' },
      });

      const before = Date.now();
      await client.refreshAccessToken();
      const expiresAt = client.getTokenPair()?.expiresAt ?? 0;
      const after = Date.now();

      const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
      expect(expiresAt).toBeGreaterThanOrEqual(before + sixMonthsMs);
      expect(expiresAt).toBeLessThanOrEqual(after + sixMonthsMs);
    });

    it('should propagate the error when the token endpoint rejects, leaving state unchanged', async () => {
      const client = new TickTickOAuthClient(baseConfig);
      client.setTokenPair({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        expiresAt: Date.now() + 1000,
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('network down'));

      await expect(client.refreshAccessToken()).rejects.toThrow('network down');
      expect(client.getTokenPair()?.accessToken).toBe('old-access');
    });
  });

  describe('exchangeCodeForToken', () => {
    afterEach(() => {
      mockedAxios.post.mockReset();
    });

    it('should exchange an authorization code for a token pair and store it', async () => {
      const client = new TickTickOAuthClient(baseConfig);
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'exchanged-access',
          refresh_token: 'exchanged-refresh',
          token_type: 'bearer',
          expires_in: 7200,
        },
      });

      const result = await client.exchangeCodeForToken('auth-code-123');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, body] = mockedAxios.post.mock.calls[0] as [string, string];
      expect(url).toBe('https://ticktick.com/oauth/token');
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=auth-code-123');
      expect(body).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');

      expect(result.accessToken).toBe('exchanged-access');
      expect(result.refreshToken).toBe('exchanged-refresh');
      expect(client.isAuthenticated()).toBe(true);
      expect(client.getTokenPair()).toEqual(result);
    });

    it('should default refreshToken to an empty string when the response omits it', async () => {
      const client = new TickTickOAuthClient(baseConfig);
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'exchanged-access', token_type: 'bearer' },
      });

      const result = await client.exchangeCodeForToken('auth-code-123');

      expect(result.refreshToken).toBe('');
    });

    it('should propagate the error when the token exchange fails, without becoming authenticated', async () => {
      const client = new TickTickOAuthClient(baseConfig);
      mockedAxios.post.mockRejectedValueOnce(new Error('invalid grant'));

      await expect(client.exchangeCodeForToken('bad-code')).rejects.toThrow('invalid grant');
      expect(client.isAuthenticated()).toBe(false);
    });
  });

  describe('getAccessToken auto-refresh behavior', () => {
    afterEach(() => {
      mockedAxios.post.mockReset();
    });

    it('should refresh automatically when the token is expiring within the 5-minute buffer', async () => {
      const client = new TickTickOAuthClient(baseConfig);
      client.setTokenPair({
        accessToken: 'about-to-expire',
        refreshToken: 'refresh-me',
        expiresAt: Date.now() + 60_000, // within the 5-minute buffer
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'refreshed-access', refresh_token: 'refresh-me', expires_in: 3600 },
      });

      const token = await client.getAccessToken();

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(token).toBe('refreshed-access');
    });

    it('should NOT refresh when the token is valid well beyond the buffer window', async () => {
      const client = new TickTickOAuthClient(baseConfig);
      client.setTokenPair({
        accessToken: 'still-valid',
        refreshToken: 'refresh-me',
        expiresAt: Date.now() + 3_600_000,
      });

      const token = await client.getAccessToken();

      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(token).toBe('still-valid');
    });
  });
});
