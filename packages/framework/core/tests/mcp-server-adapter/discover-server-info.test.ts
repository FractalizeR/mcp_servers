/**
 * Тесты для patchDiscoverServerInfo (пакет 3.1.D плана модернизации MCP
 * 2026-07-28). Проверяют контракт независимо от реального SDK Server:
 * достаточно объекта с методом `_ondiscover()` нужной формы — именно этот
 * узкий контракт adapter использует (см. discover-server-info.ts).
 */

import { describe, it, expect } from 'vitest';
import { SERVER_INFO_META_KEY } from '@modelcontextprotocol/server';
import type { Implementation } from '@modelcontextprotocol/server';
import {
  patchDiscoverServerInfo,
  type DiscoverableServer,
} from '../../src/mcp-server-adapter/discover-server-info.js';

const IDENTITY_WITH_ICONS: Implementation = {
  name: 'test-server',
  version: '1.2.3',
  icons: [{ src: 'data:image/png;base64,AAAA', mimeType: 'image/png', sizes: ['48x48'] }],
};

function makeServerStub(baseResult: unknown): DiscoverableServer {
  return {
    _ondiscover: (): unknown => baseResult,
  };
}

describe('patchDiscoverServerInfo', () => {
  it('добавляет _meta[SERVER_INFO_META_KEY] с переданной identity, сохраняя остальные поля', () => {
    const base = { supportedVersions: ['2026-07-28'], capabilities: { tools: {} } };
    const server = makeServerStub(base);

    patchDiscoverServerInfo(server, IDENTITY_WITH_ICONS);
    const result = server._ondiscover() as Record<string, unknown>;

    expect(result['supportedVersions']).toEqual(['2026-07-28']);
    expect(result['capabilities']).toEqual({ tools: {} });
    expect(result['_meta']).toEqual({ [SERVER_INFO_META_KEY]: IDENTITY_WITH_ICONS });
  });

  it('переданная identity несёт icons (иначе патч бессмысленен)', () => {
    const server = makeServerStub({ supportedVersions: [], capabilities: {} });

    patchDiscoverServerInfo(server, IDENTITY_WITH_ICONS);
    const result = server._ondiscover() as { _meta: Record<string, Implementation> };

    expect(result._meta[SERVER_INFO_META_KEY]?.icons).toBeDefined();
    expect(result._meta[SERVER_INFO_META_KEY]?.icons?.length).toBeGreaterThan(0);
  });

  it('сохраняет instructions, когда оригинальный _ondiscover его вернул', () => {
    const base = {
      supportedVersions: ['2026-07-28'],
      capabilities: {},
      instructions: 'some instructions',
    };
    const server = makeServerStub(base);

    patchDiscoverServerInfo(server, IDENTITY_WITH_ICONS);
    const result = server._ondiscover() as Record<string, unknown>;

    expect(result['instructions']).toBe('some instructions');
  });

  it('пересчитывает базовый результат при каждом вызове (не кеширует)', () => {
    let call = 0;
    const server: DiscoverableServer = {
      _ondiscover: (): unknown => {
        call += 1;
        return { supportedVersions: [`v${call}`], capabilities: {} };
      },
    };

    patchDiscoverServerInfo(server, IDENTITY_WITH_ICONS);

    const first = server._ondiscover() as { supportedVersions: string[] };
    const second = server._ondiscover() as { supportedVersions: string[] };

    expect(first.supportedVersions).toEqual(['v1']);
    expect(second.supportedVersions).toEqual(['v2']);
  });

  it('бросает понятную ошибку, если оригинальный _ondiscover вернул неожиданную форму', () => {
    const server = makeServerStub({ notSupportedVersions: true });

    patchDiscoverServerInfo(server, IDENTITY_WITH_ICONS);

    expect(() => server._ondiscover()).toThrowError(/неожиданную форму/);
  });

  it('бросает понятную ошибку, если оригинальный _ondiscover вернул примитив', () => {
    const server = makeServerStub(null);

    patchDiscoverServerInfo(server, IDENTITY_WITH_ICONS);

    expect(() => server._ondiscover()).toThrowError(/неожиданную форму/);
  });
});
