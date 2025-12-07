/**
 * Unit tests for TickTickOAuthClient
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TickTickOAuthClient } from '../../../src/ticktick_api/auth/oauth-client.js';
import type { OAuthConfig } from '../../../src/config/server-config.interface.js';

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
});
