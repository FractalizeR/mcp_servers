// tests/unit/composition-root/resource-registry.test.ts
/**
 * Проверка DI-провода ResourceRegistry (пакет 5.1.C.wiki): composition root
 * регистрирует ровно два провайдера (страницы + не-табличные ресурсы
 * страницы), реестр агрегирует их корректно, а несуществующий/чужой URI
 * даёт `ResourceNotFoundError` (SDK сериализует его как `-32602`, см.
 * `.code`, само сведение к JSON-RPC уже проверено на уровне framework —
 * `resources.wire.test.ts`, здесь дублировать wire-уровень незачем).
 */
import { describe, it, expect } from 'vitest';
import { ResourceNotFoundError } from '@modelcontextprotocol/server';
import type { ResourceRegistry } from '@fractalizer/mcp-core';
import { createContainer } from '../../../src/composition-root/container.js';
import { TYPES } from '../../../src/composition-root/types.js';
import type { ServerConfig } from '../../../src/config/index.js';

const fakeConfig: ServerConfig = {
  token: 'OAuth fake-token',
  orgId: 'fake-org',
  apiBase: 'https://api.wiki.yandex.net',
  requestTimeout: 30000,
  maxBatchSize: 50,
  maxConcurrentRequests: 10,
  logLevel: 'error',
  prettyLogs: false,
  logsDir: '/tmp/logs',
  logMaxSize: 10485760,
  logMaxFiles: 5,
  retryAttempts: 3,
  retryMinDelay: 1000,
  retryMaxDelay: 10000,
};

describe('composition-root: ResourceRegistry wiring', () => {
  it('регистрирует ровно 2 провайдера (wiki-pages, wiki-page-resources)', async () => {
    const container = await createContainer(fakeConfig);
    const registry = container.get<ResourceRegistry>(TYPES.ResourceRegistry);

    const templates = await registry.listTemplates();
    const names = templates.map((t) => t.name).sort();
    expect(names).toEqual(['wiki-page', 'wiki-page-resource']);
  });

  it('singleton: повторный get() возвращает тот же инстанс', async () => {
    const container = await createContainer(fakeConfig);
    const first = container.get<ResourceRegistry>(TYPES.ResourceRegistry);
    const second = container.get<ResourceRegistry>(TYPES.ResourceRegistry);
    expect(first).toBe(second);
  });

  it('listResources() агрегата честно пуст (оба провайдера без глобального обзора)', async () => {
    const container = await createContainer(fakeConfig);
    const registry = container.get<ResourceRegistry>(TYPES.ResourceRegistry);

    // 2 провайдера: реестр переключается на следующего, даже когда у
    // текущего resources пуст (см. ResourceRegistry.projectPage) — поэтому
    // честная проверка "пусто" — пройти агрегат до конца, а не одну страницу.
    const allResources: unknown[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await registry.listResources(cursor);
      allResources.push(...page.resources);
      cursor = page.nextCursor;
      pages += 1;
      expect(pages).toBeLessThan(10); // защита от зацикливания
    } while (cursor !== undefined);

    expect(allResources).toEqual([]);
    expect(pages).toBe(2); // по одной "пустой" странице на каждого из 2 провайдеров
  });

  it('несуществующий/чужой URI → ResourceNotFoundError с code -32602 (DoD п.3)', async () => {
    const container = await createContainer(fakeConfig);
    const registry = container.get<ResourceRegistry>(TYPES.ResourceRegistry);

    await expect(registry.readResource('does-not-exist://anything')).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ResourceNotFoundError);
        expect((error as ResourceNotFoundError).code).toBe(-32602);
        return true;
      }
    );
  });

  it('URI типа grid (wiki://page-resource/.../grid/...) тоже не резолвится — таблицы вне Resources', async () => {
    const container = await createContainer(fakeConfig);
    const registry = container.get<ResourceRegistry>(TYPES.ResourceRegistry);

    await expect(
      registry.readResource('wiki://page-resource/1/grid/SomeGrid')
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
