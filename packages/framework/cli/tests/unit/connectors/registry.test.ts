/**
 * Тесты ConnectorRegistry.
 *
 * Покрытие:
 *  - register/get/getAll
 *  - findInstalled — параллельная проверка isInstalled
 *  - checkAllStatuses — параллельность через Promise.allSettled
 *  - checkAllStatuses — обработка исключений (одна сломанная не валит всё)
 *  - детерминированный порядок результатов в Map
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectorRegistry } from '../../../src/connectors/registry.js';
import type { MCPConnector } from '../../../src/connectors/base/connector.interface.js';
import type { MCPClientInfo, ConnectionStatus } from '../../../src/types/client.types.js';
import type { GetLaunchSpecResult, ServerLaunchSpec } from '../../../src/types/launch.types.js';

interface MockConnectorOpts {
  name: string;
  displayName?: string;
  isInstalled?: boolean;
  getStatusImpl?: () => Promise<ConnectionStatus>;
}

function makeConnector(opts: MockConnectorOpts): MCPConnector {
  const info: MCPClientInfo = {
    name: opts.name,
    displayName: opts.displayName ?? opts.name,
    description: opts.name,
    configPath: `/tmp/${opts.name}.json`,
    platforms: ['darwin', 'linux', 'win32'],
  };
  return {
    getClientInfo: () => info,
    isInstalled: () => Promise.resolve(opts.isInstalled ?? true),
    getStatus: opts.getStatusImpl ?? (() => Promise.resolve({ connected: false })),
    connect: vi.fn<(spec: ServerLaunchSpec) => Promise<void>>(),
    disconnect: vi.fn<() => Promise<void>>(),
    validateLaunchSpec: vi.fn<(spec: ServerLaunchSpec) => Promise<string[]>>(),
    getLaunchSpec: vi.fn<() => Promise<GetLaunchSpecResult>>(),
  } as unknown as MCPConnector;
}

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    registry = new ConnectorRegistry();
  });

  describe('register/get/getAll', () => {
    it('register сохраняет коннектор по имени из ClientInfo', () => {
      const c = makeConnector({ name: 'gemini' });
      registry.register(c);
      expect(registry.get('gemini')).toBe(c);
    });

    it('get возвращает undefined для незарегистрированного', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });

    it('getAll возвращает все коннекторы в порядке регистрации', () => {
      const a = makeConnector({ name: 'a' });
      const b = makeConnector({ name: 'b' });
      const c = makeConnector({ name: 'c' });
      registry.register(a);
      registry.register(b);
      registry.register(c);
      expect(registry.getAll()).toEqual([a, b, c]);
    });

    it('повторная регистрация с тем же именем — перезаписывает', () => {
      const a1 = makeConnector({ name: 'gemini' });
      const a2 = makeConnector({ name: 'gemini', displayName: 'Other' });
      registry.register(a1);
      registry.register(a2);
      expect(registry.get('gemini')).toBe(a2);
      expect(registry.getAll()).toHaveLength(1);
    });
  });

  describe('findInstalled', () => {
    it('возвращает только установленные', async () => {
      registry.register(makeConnector({ name: 'a', isInstalled: true }));
      registry.register(makeConnector({ name: 'b', isInstalled: false }));
      registry.register(makeConnector({ name: 'c', isInstalled: true }));

      const installed = await registry.findInstalled();
      expect(installed.map((c) => c.getClientInfo().name)).toEqual(['a', 'c']);
    });

    it('пустой реестр → пустой массив', async () => {
      expect(await registry.findInstalled()).toEqual([]);
    });
  });

  describe('checkAllStatuses', () => {
    it('возвращает Map с именами коннекторов и их статусами', async () => {
      registry.register(
        makeConnector({
          name: 'a',
          getStatusImpl: () => Promise.resolve({ connected: true }),
        })
      );
      registry.register(
        makeConnector({
          name: 'b',
          getStatusImpl: () => Promise.resolve({ connected: false, error: 'oops' }),
        })
      );

      const result = await registry.checkAllStatuses();
      expect(result.size).toBe(2);
      expect(result.get('a')).toEqual({ connected: true });
      expect(result.get('b')).toEqual({ connected: false, error: 'oops' });
    });

    it('исключение в одном getStatus → connected: false, error содержит сообщение', async () => {
      registry.register(
        makeConnector({
          name: 'ok',
          getStatusImpl: () => Promise.resolve({ connected: true }),
        })
      );
      registry.register(
        makeConnector({
          name: 'broken',
          getStatusImpl: () => Promise.reject(new Error('boom!')),
        })
      );

      const result = await registry.checkAllStatuses();
      expect(result.get('ok')).toEqual({ connected: true });
      expect(result.get('broken')).toEqual({
        connected: false,
        error: expect.stringContaining('boom!'),
      });
    });

    it('параллельность: 3 коннектора по ~100ms работают <200ms (а не 300+)', async () => {
      const delayedStatus = (delay: number, status: ConnectionStatus) => () =>
        new Promise<ConnectionStatus>((resolve) => setTimeout(() => resolve(status), delay));

      registry.register(
        makeConnector({ name: 'a', getStatusImpl: delayedStatus(100, { connected: true }) })
      );
      registry.register(
        makeConnector({ name: 'b', getStatusImpl: delayedStatus(100, { connected: false }) })
      );
      registry.register(
        makeConnector({ name: 'c', getStatusImpl: delayedStatus(100, { connected: true }) })
      );

      const start = performance.now();
      const result = await registry.checkAllStatuses();
      const elapsed = performance.now() - start;

      // Если бы последовательно: ~300ms. Параллельно: ~100ms (даём запас до 200ms).
      expect(elapsed).toBeLessThan(200);
      expect(result.size).toBe(3);
    });

    it('пустой реестр → пустой Map', async () => {
      const result = await registry.checkAllStatuses();
      expect(result.size).toBe(0);
    });

    it('не-Error rejection: преобразуется в строку', async () => {
      registry.register(
        makeConnector({
          name: 'weird',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          getStatusImpl: () => Promise.reject('string-error' as any),
        })
      );
      const result = await registry.checkAllStatuses();
      expect(result.get('weird')).toEqual({
        connected: false,
        error: expect.stringContaining('string-error'),
      });
    });
  });
});
