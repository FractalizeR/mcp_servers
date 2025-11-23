import { describe, it, expect, beforeEach } from 'vitest';
import { listCommand } from '../../../src/commands/list.command.js';
import { ConnectorRegistry } from '../../../src/connectors/registry.js';
import type { BaseMCPServerConfig } from '../../../src/types.js';

describe('listCommand', () => {
  let registry: ConnectorRegistry<BaseMCPServerConfig>;

  beforeEach(() => {
    registry = new ConnectorRegistry<BaseMCPServerConfig>();
  });

  it('should execute without errors with empty registry', async () => {
    await expect(listCommand({ registry })).resolves.toBeUndefined();
  });

  it('should be a function', () => {
    expect(typeof listCommand).toBe('function');
  });

  it('should accept registry in options', async () => {
    const options = { registry };
    await expect(listCommand(options)).resolves.toBeUndefined();
  });
});
