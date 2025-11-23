import { describe, it, expect, beforeEach } from 'vitest';
import { disconnectCommand } from '../../../src/commands/disconnect.command.js';
import { ConnectorRegistry } from '../../../src/connectors/registry.js';
import type { BaseMCPServerConfig } from '../../../src/types.js';

describe('disconnectCommand', () => {
  let registry: ConnectorRegistry<BaseMCPServerConfig>;

  beforeEach(() => {
    registry = new ConnectorRegistry<BaseMCPServerConfig>();
  });

  it('should execute without errors with empty registry (no connected clients)', async () => {
    await expect(disconnectCommand({ registry })).resolves.toBeUndefined();
  });

  it('should be a function', () => {
    expect(typeof disconnectCommand).toBe('function');
  });

  it('should accept registry and cliOptions in options', async () => {
    const options = { registry, cliOptions: { client: 'test-client' } };
    // Should fail gracefully because no such client exists
    await expect(disconnectCommand(options)).resolves.toBeUndefined();
  });
});
