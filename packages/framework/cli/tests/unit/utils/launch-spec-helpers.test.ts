/**
 * Тесты resolveExecutablePath.
 *
 * Логика выровнена с BaseConnector.validateLaunchSpec — те же ветки.
 */

import { describe, it, expect } from 'vitest';
import { resolveExecutablePath } from '../../../src/utils/launch-spec-helpers.js';

describe('resolveExecutablePath', () => {
  it('абсолютный путь команды → возвращает её', () => {
    expect(resolveExecutablePath({ command: '/abs/server', args: [], env: {} })).toBe(
      '/abs/server'
    );
  });

  it('node + первый абсолютный путь в args', () => {
    expect(
      resolveExecutablePath({
        command: 'node',
        args: ['/abs/script.cjs'],
        env: {},
      })
    ).toBe('/abs/script.cjs');
  });

  it('node + Node-флаги перед скриптом', () => {
    expect(
      resolveExecutablePath({
        command: 'node',
        args: ['--no-warnings', '--enable-source-maps', '/abs/script.cjs'],
        env: {},
      })
    ).toBe('/abs/script.cjs');
  });

  it('node без абсолютного пути в args → null', () => {
    expect(resolveExecutablePath({ command: 'node', args: ['--version'], env: {} })).toBeNull();
  });

  it('npx → null', () => {
    expect(resolveExecutablePath({ command: 'npx', args: ['some-pkg'], env: {} })).toBeNull();
  });

  it('pipx → null', () => {
    expect(resolveExecutablePath({ command: 'pipx', args: ['run', 'tool'], env: {} })).toBeNull();
  });

  it('uvx → null', () => {
    expect(resolveExecutablePath({ command: 'uvx', args: ['pkg'], env: {} })).toBeNull();
  });

  it('относительная команда → null', () => {
    expect(resolveExecutablePath({ command: './local-bin', args: [], env: {} })).toBeNull();
  });
});
