/**
 * Тесты ResourceRegistry (пакет 5.1.A плана модернизации MCP 2026-07-28).
 *
 * Покрывает DoD пакета:
 *  - агрегированная пагинация resources/list курсором (тем же механизмом,
 *    что и internal cursor Трекера — здесь его generic-версия);
 *  - resources/read по uri, отсутствующему в resources/list;
 *  - несуществующий ресурс → ResourceNotFoundError (SDK сериализует как
 *    -32602, проверено отдельно на wire-уровне в resources.wire.test.ts);
 *  - защита курсора: чужой/битый курсор → ProtocolError(-32602).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceNotFoundError, ProtocolError } from '@modelcontextprotocol/server';
import { ResourceRegistry } from '../../src/resources/resource-registry.js';
import { OpaqueCursorCodec } from '../../src/resources/pagination/opaque-cursor.js';
import type {
  ResourceProvider,
  ResourceListPage,
  McpResource,
  McpResourceContents,
  McpResourceTemplate,
} from '../../src/resources/resource-provider.js';

/**
 * Провайдер-заглушка для тестов: постранично отдаёт `pageSize` элементов из
 * `allResources`, плюс умеет вернуть содержимое ЛЮБОГО uri из `contentsByUri`
 * — включая те, что НЕ входят в `allResources` (проверка требования плана
 * "readResource обязан уметь отдать то, чего нет в resources/list").
 */
class FakeResourceProvider implements ResourceProvider {
  constructor(
    public readonly id: string,
    private readonly allResources: readonly McpResource[],
    private readonly contentsByUri: ReadonlyMap<string, readonly McpResourceContents[]>,
    private readonly templates: readonly McpResourceTemplate[] = [],
    private readonly pageSize = 2
  ) {}

  listResources(cursor?: string): ResourceListPage {
    const offset = cursor === undefined ? 0 : this.decodeOffset(cursor);
    const slice = this.allResources.slice(offset, offset + this.pageSize);
    const nextOffset = offset + this.pageSize;
    const hasMore = nextOffset < this.allResources.length;

    return {
      resources: slice,
      ...(hasMore ? { nextCursor: this.encodeOffset(nextOffset) } : {}),
    };
  }

  readResource(uri: string): readonly McpResourceContents[] | undefined {
    return this.contentsByUri.get(uri);
  }

  listTemplates(): readonly McpResourceTemplate[] {
    return this.templates;
  }

  private encodeOffset(offset: number): string {
    return OpaqueCursorCodec.encode({ offset }, this.id);
  }

  private decodeOffset(cursor: string): number {
    return OpaqueCursorCodec.decode<{ offset: number }>(cursor, this.id).offset;
  }
}

function resource(uri: string): McpResource {
  return { uri, name: uri };
}

function textContents(uri: string, text: string): readonly McpResourceContents[] {
  return [{ uri, text }];
}

describe('ResourceRegistry', () => {
  let registry: ResourceRegistry;
  let providerA: FakeResourceProvider;
  let providerB: FakeResourceProvider;

  beforeEach(() => {
    registry = new ResourceRegistry();

    providerA = new FakeResourceProvider(
      'provider-a',
      [resource('a://1'), resource('a://2'), resource('a://3')],
      new Map([
        ['a://1', textContents('a://1', 'A1')],
        // a://hidden НЕ входит в allResources — проверка независимости readResource.
        ['a://hidden', textContents('a://hidden', 'скрытый ресурс a')],
      ]),
      [{ uriTemplate: 'a://{id}', name: 'a-template' }]
    );

    providerB = new FakeResourceProvider(
      'provider-b',
      [resource('b://1')],
      new Map([['b://1', textContents('b://1', 'B1')]]),
      [{ uriTemplate: 'b://{id}', name: 'b-template' }]
    );

    registry.register(providerA);
    registry.register(providerB);
  });

  it('пустой реестр отвечает пустым списком, а не ошибкой', async () => {
    const empty = new ResourceRegistry();
    await expect(empty.listResources()).resolves.toEqual({ resources: [] });
    await expect(empty.listTemplates()).resolves.toEqual([]);
  });

  it('пустой реестр: readResource любого uri → ResourceNotFoundError', async () => {
    const empty = new ResourceRegistry();
    await expect(empty.readResource('whatever://uri')).rejects.toBeInstanceOf(
      ResourceNotFoundError
    );
  });

  it('листинг без курсора начинается с первого провайдера (детерминированный порядок по id)', async () => {
    const page = await registry.listResources();
    expect(page.resources.map((r) => r.uri)).toEqual(['a://1', 'a://2']);
    expect(page.nextCursor).toBeDefined();
  });

  it('курсор продолжает страницы ВНУТРИ того же провайдера, пока у него есть nextCursor', async () => {
    const first = await registry.listResources();
    const second = await registry.listResources(first.nextCursor);

    // provider-a: 3 ресурса, pageSize=2 → вторая страница [a://3], затем
    // переключение на provider-b.
    expect(second.resources.map((r) => r.uri)).toEqual(['a://3']);
    expect(second.nextCursor).toBeDefined();
  });

  it('курсор переключается на следующего провайдера, когда текущий исчерпан', async () => {
    const first = await registry.listResources();
    const second = await registry.listResources(first.nextCursor);
    const third = await registry.listResources(second.nextCursor);

    expect(third.resources.map((r) => r.uri)).toEqual(['b://1']);
    // provider-b исчерпан и он последний — курсора для продолжения быть не должно.
    expect(third.nextCursor).toBeUndefined();
  });

  it('полный обход агрегированного списка даёт все ресурсы всех провайдеров ровно по разу', async () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 10; guard += 1) {
      const page = await registry.listResources(cursor);
      seen.push(...page.resources.map((r) => r.uri));
      if (page.nextCursor === undefined) break;
      cursor = page.nextCursor;
    }
    expect(seen).toEqual(['a://1', 'a://2', 'a://3', 'b://1']);
  });

  it('readResource отдаёт содержимое uri, ОТСУТСТВУЮЩЕГО в resources/list', async () => {
    const contents = await registry.readResource('a://hidden');
    expect(contents).toEqual(textContents('a://hidden', 'скрытый ресурс a'));
  });

  it('readResource опрашивает провайдеров по очереди и находит владельца uri', async () => {
    const contents = await registry.readResource('b://1');
    expect(contents).toEqual(textContents('b://1', 'B1'));
  });

  it('readResource несуществующего uri → ResourceNotFoundError', async () => {
    await expect(registry.readResource('nowhere://x')).rejects.toBeInstanceOf(
      ResourceNotFoundError
    );
  });

  it('ResourceNotFoundError несёт запрошенный uri', async () => {
    try {
      await registry.readResource('nowhere://x');
      expect.fail('ожидался throw ResourceNotFoundError');
    } catch (error) {
      expect(error).toBeInstanceOf(ResourceNotFoundError);
      expect((error as ResourceNotFoundError).uri).toBe('nowhere://x');
    }
  });

  it('listTemplates конкатенирует шаблоны всех провайдеров', async () => {
    const templates = await registry.listTemplates();
    expect(templates).toEqual([
      { uriTemplate: 'a://{id}', name: 'a-template' },
      { uriTemplate: 'b://{id}', name: 'b-template' },
    ]);
  });

  it('курсор, выданный ДРУГИМ агрегатом (чужой тег) → ProtocolError(-32602)', async () => {
    const foreignCursor = OpaqueCursorCodec.encode(
      { providerId: 'provider-a' },
      'not-resources-agg'
    );
    await expect(registry.listResources(foreignCursor)).rejects.toMatchObject({
      code: -32602,
    });
  });

  it('курсор, битый на уровне base64/JSON → ProtocolError(-32602)', async () => {
    await expect(registry.listResources('r1:not-a-real-cursor')).rejects.toMatchObject({
      code: -32602,
    });
    await expect(registry.listResources('r1:not-a-real-cursor')).rejects.toBeInstanceOf(
      ProtocolError
    );
  });

  it('курсор, ссылающийся на провайдера, которого больше нет в реестре → ProtocolError(-32602)', async () => {
    const staleProviderCursor = OpaqueCursorCodec.encode(
      { providerId: 'provider-removed' },
      'resources-agg'
    );
    await expect(registry.listResources(staleProviderCursor)).rejects.toMatchObject({
      code: -32602,
    });
  });

  it('register с уже занятым id — ошибка конфигурации, не тихая перезапись', () => {
    expect(() => registry.register(providerA)).toThrowError(/уже зарегистрирован/);
  });
});
