import { describe, it, expect } from 'vitest';
import { CommandExecutor } from '../../../src/utils/command-executor.js';

describe('CommandExecutor', () => {
  it('should execute command and return output', () => {
    const output = CommandExecutor.exec('echo "test"');
    expect(output.trim()).toBe('test');
  });

  it('should check if command is available', () => {
    expect(CommandExecutor.isCommandAvailable('node')).toBe(true);
    expect(CommandExecutor.isCommandAvailable('non-existent-command-xyz')).toBe(false);
  });

  it('should execute silently without errors', () => {
    expect(() => CommandExecutor.execSilent('echo "test"')).not.toThrow();
  });

  it('should throw error for failed command', () => {
    expect(() => CommandExecutor.exec('nonexistent-command-xyz')).toThrow('Command failed');
  });

  it('should execute interactive command successfully', async () => {
    // Test with echo which always succeeds
    await expect(CommandExecutor.execInteractive('echo', ['test'])).resolves.toBeUndefined();
  });

  it('should reject interactive command on failure', async () => {
    // Test with false command which always fails
    await expect(CommandExecutor.execInteractive('false', [])).rejects.toThrow(
      'Command exited with code'
    );
  });
});
