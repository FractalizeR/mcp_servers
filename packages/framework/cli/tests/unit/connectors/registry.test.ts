/**
 * ConnectorRegistry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectorRegistry } from '../../../src/connectors/registry.js';
import { ClaudeDesktopConnector } from '../../../src/connectors/claude-desktop/claude-desktop.connector.js';
import { GeminiConnector } from '../../../src/connectors/gemini/gemini.connector.js';
import type { BaseMCPServerConfig } from '../../../src/types.js';

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry<BaseMCPServerConfig>;

  beforeEach(() => {
    registry = new ConnectorRegistry<BaseMCPServerConfig>();
  });

  it('should register a connector', () => {
    const connector = new ClaudeDesktopConnector('test-server', 'dist/index.js');
    registry.register(connector);

    const retrieved = registry.get('claude-desktop');
    expect(retrieved).toBeDefined();
    expect(retrieved?.getClientInfo().name).toBe('claude-desktop');
  });

  it('should register multiple connectors', () => {
    const claude = new ClaudeDesktopConnector('test-server', 'dist/index.js');
    const gemini = new GeminiConnector('test-server', 'dist/index.js');

    registry.register(claude);
    registry.register(gemini);

    const all = registry.getAll();
    expect(all.length).toBe(2);
    expect(all.some((c) => c.getClientInfo().name === 'claude-desktop')).toBe(true);
    expect(all.some((c) => c.getClientInfo().name === 'gemini')).toBe(true);
  });

  it('should return undefined for non-existent connector', () => {
    const connector = registry.get('non-existent');
    expect(connector).toBeUndefined();
  });

  it('should get all registered connectors', () => {
    const claude = new ClaudeDesktopConnector('test-server', 'dist/index.js');
    const gemini = new GeminiConnector('test-server', 'dist/index.js');

    registry.register(claude);
    registry.register(gemini);

    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  it('should find installed connectors', async () => {
    const claude = new ClaudeDesktopConnector('test-server', 'dist/index.js');
    const gemini = new GeminiConnector('test-server', 'dist/index.js');

    registry.register(claude);
    registry.register(gemini);

    const installed = await registry.findInstalled();

    // At least one should be found (depends on environment)
    // This test is environment-dependent, so we just check the structure
    expect(Array.isArray(installed)).toBe(true);
  });

  it('should check statuses of all connectors', async () => {
    const claude = new ClaudeDesktopConnector('test-server', 'dist/index.js');
    registry.register(claude);

    const statuses = await registry.checkAllStatuses();

    expect(statuses).toBeInstanceOf(Map);
    expect(statuses.has('claude-desktop')).toBe(true);

    const claudeStatus = statuses.get('claude-desktop');
    expect(claudeStatus).toBeDefined();
    expect(claudeStatus).toHaveProperty('connected');
  });
});
