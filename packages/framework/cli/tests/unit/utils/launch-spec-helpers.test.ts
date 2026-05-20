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

  describe('Node argv-aware (N5)', () => {
    it('--import <abs/preload> /abs/server.cjs → возвращает /abs/server.cjs (НЕ preload!)', () => {
      // Регрессия для N5: раньше возвращался первый абсолютный путь = preload.
      expect(
        resolveExecutablePath({
          command: 'node',
          args: ['--import', '/abs/preload.mjs', '/abs/server.cjs'],
          env: {},
        })
      ).toBe('/abs/server.cjs');
    });

    it('--import=<abs/preload> /abs/server.cjs → возвращает /abs/server.cjs', () => {
      expect(
        resolveExecutablePath({
          command: 'node',
          args: ['--import=/abs/preload.mjs', '/abs/server.cjs'],
          env: {},
        })
      ).toBe('/abs/server.cjs');
    });

    it('--experimental-loader <loader> --enable-source-maps /abs/server.cjs', () => {
      expect(
        resolveExecutablePath({
          command: 'node',
          args: [
            '--experimental-loader',
            '/abs/loader.mjs',
            '--enable-source-maps',
            '/abs/server.cjs',
          ],
          env: {},
        })
      ).toBe('/abs/server.cjs');
    });

    it('--require <preload> /abs/server.cjs → /abs/server.cjs', () => {
      expect(
        resolveExecutablePath({
          command: 'node',
          args: ['--require', '/abs/preload.cjs', '/abs/server.cjs'],
          env: {},
        })
      ).toBe('/abs/server.cjs');
    });

    it('-r <preload> /abs/server.cjs → /abs/server.cjs (короткая форма --require)', () => {
      expect(
        resolveExecutablePath({
          command: 'node',
          args: ['-r', '/abs/preload.cjs', '/abs/server.cjs'],
          env: {},
        })
      ).toBe('/abs/server.cjs');
    });

    it('--inspect-brk=9229 /abs/server.cjs → /abs/server.cjs', () => {
      expect(
        resolveExecutablePath({
          command: 'node',
          args: ['--inspect-brk=9229', '/abs/server.cjs'],
          env: {},
        })
      ).toBe('/abs/server.cjs');
    });

    it('node без positional аргумента → null', () => {
      expect(
        resolveExecutablePath({
          command: 'node',
          args: ['--no-warnings', '--enable-source-maps'],
          env: {},
        })
      ).toBeNull();
    });

    it('node с относительным скриптом → null', () => {
      expect(
        resolveExecutablePath({
          command: 'node',
          args: ['./relative/server.cjs'],
          env: {},
        })
      ).toBeNull();
    });
  });
});
