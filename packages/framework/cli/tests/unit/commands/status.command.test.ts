import { describe, it, expect, beforeEach } from 'vitest';
import { statusCommand } from '../../../src/commands/status.command.js';
import { ConnectorRegistry } from '../../../src/connectors/registry.js';
import type { BaseMCPServerConfig } from '../../../src/types.js';

describe('statusCommand', () => {
  let registry: ConnectorRegistry<BaseMCPServerConfig>;

  beforeEach(() => {
    registry = new ConnectorRegistry<BaseMCPServerConfig>();
  });

  it('should execute without errors with empty registry', async () => {
    await expect(statusCommand({ registry })).resolves.toBeUndefined();
  });

  it('should be a function', () => {
    expect(typeof statusCommand).toBe('function');
  });

  it('should accept registry in options', async () => {
    const options = { registry };
    await expect(statusCommand(options)).resolves.toBeUndefined();
  });
});
