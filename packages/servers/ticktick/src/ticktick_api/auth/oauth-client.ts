/**
 * TickTick OAuth 2.0 Client
 *
 * Manages OAuth tokens for TickTick API authentication.
 * Handles token refresh automatically when access token expires.
 */

import axios from 'axios';
import type { OAuthConfig } from '#config';

/**
 * OAuth 2.0 token pair
 */
export interface TokenPair {
  /** Access token for API requests */
  accessToken: string;
  /** Refresh token for obtaining new access token */
  refreshToken: string;
  /** Expiration timestamp in milliseconds */
  expiresAt: number;
}

/**
 * OAuth token response from TickTick API
 */
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  /** Token lifetime in seconds */
  expires_in?: number;
  scope?: string;
}

/**
 * TickTick OAuth 2.0 client
 *
 * Responsibilities:
 * - Token management (get, refresh, exchange)
 * - Authorization URL generation
 * - Token expiration tracking
 *
 * NOT responsible for:
 * - HTTP requests to API (delegated to AuthenticatedHttpClient)
 * - Caching (handled separately)
 */
export class TickTickOAuthClient {
  private tokenPair: TokenPair | null = null;
  private readonly tokenEndpoint = 'https://ticktick.com/oauth/token';
  private readonly authEndpoint = 'https://ticktick.com/oauth/authorize';

  /** Buffer time before token expiration to trigger refresh (5 minutes) */
  private readonly expirationBuffer = 5 * 60 * 1000;
  /** Default token lifetime (~6 months in ms) */
  private readonly defaultExpiresIn = 6 * 30 * 24 * 60 * 60;

  constructor(private readonly config: OAuthConfig) {
    // Initialize from config if tokens are available
    if (config.accessToken) {
      this.tokenPair = {
        accessToken: config.accessToken,
        refreshToken: config.refreshToken ?? '',
        // If no explicit expiration, assume ~6 months
        expiresAt: Date.now() + this.defaultExpiresIn * 1000,
      };
    }
  }

  /**
   * Get valid access token
   *
   * Automatically refreshes token if expired or about to expire.
   *
   * @throws Error if not authenticated
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokenPair) {
      throw new Error(
        'Not authenticated. Call authenticate() first or provide accessToken in config.'
      );
    }

    // Check if token is expired or about to expire
    if (this.isTokenExpiringSoon()) {
      await this.refreshAccessToken();
    }

    return this.tokenPair.accessToken;
  }

  /**
   * Check if token is expired or expiring soon
   */
  private isTokenExpiringSoon(): boolean {
    if (!this.tokenPair) {
      return true;
    }
    return this.tokenPair.expiresAt - Date.now() < this.expirationBuffer;
  }

  /**
   * Refresh access token using refresh token
   *
   * @throws Error if refresh token is not available or refresh fails
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.tokenPair?.refreshToken) {
      throw new Error('No refresh token available. Re-authentication required.');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.tokenPair.refreshToken,
    });

    const response = await axios.post<TokenResponse>(this.tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.tokenPair = {
      accessToken: response.data.access_token,
      // Use new refresh token if provided, otherwise keep old one
      refreshToken: response.data.refresh_token ?? this.tokenPair.refreshToken,
      expiresAt: Date.now() + (response.data.expires_in ?? this.defaultExpiresIn) * 1000,
    };
  }

  /**
   * Get OAuth authorization URL for user consent
   *
   * @param scopes - OAuth scopes to request
   * @param state - Optional state parameter for CSRF protection
   */
  getAuthorizationUrl(scopes: string[] = ['tasks:read', 'tasks:write'], state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
    });

    if (state) {
      params.set('state', state);
    }

    return `${this.authEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   *
   * Called after user grants consent and is redirected back.
   *
   * @param code - Authorization code from redirect
   * @returns Token pair with access and refresh tokens
   */
  async exchangeCodeForToken(code: string): Promise<TokenPair> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
    });

    const response = await axios.post<TokenResponse>(this.tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.tokenPair = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token ?? '',
      expiresAt: Date.now() + (response.data.expires_in ?? this.defaultExpiresIn) * 1000,
    };

    return this.tokenPair;
  }

  /**
   * Check if client has valid tokens
   */
  isAuthenticated(): boolean {
    return this.tokenPair !== null;
  }

  /**
   * Get current token pair (for persistence)
   *
   * Returns null if not authenticated.
   */
  getTokenPair(): TokenPair | null {
    return this.tokenPair;
  }

  /**
   * Set token pair (for restoring from persistence)
   */
  setTokenPair(tokenPair: TokenPair): void {
    this.tokenPair = tokenPair;
  }
}
