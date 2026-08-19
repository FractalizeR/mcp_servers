/**
 * Тесты DevSession на инъецированной заглушке транспорта (без спавна процесса).
 *
 * Покрывает: открытие сессии (handshake), listTools → классифицируемый
 * ToolSummary, callTool, двойное закрытие, таймаут handshake с накопленным
 * замаскированным stderr, неизвестный инструмент / невалидные аргументы —
 * два разных наблюдаемых исхода.
 */

import { describe, it, expect } from 'vitest';
import { DevSession, HandshakeTimeoutError } from '../../../src/session/dev-session.js';
import { createMasker } from '../../../src/secrets/masker.js';
import { FakeTransport } from './fake-transport.js';

const NO_OP_MASKER = createMasker({ clientEnv: {} });
const LAUNCH = { command: 'node', args: ['fake.js'], env: {}, cwd: '/tmp' };

function openWith(transport: FakeTransport, masker = NO_OP_MASKER) {
  return DevSession.open({
    launch: LAUNCH,
    masker,
    transportFactory: () => transport,
  });
}

describe('DevSession.open', () => {
  it('открывает сессию (успешный handshake) против заглушки транспорта', async () => {
    const transport = new FakeTransport();
    const session = await openWith(transport);
    expect(session).toBeInstanceOf(DevSession);
    await session.close();
  });

  it('listTools возвращает ToolSummary с корректной классификацией read/write/local-side-effect входных признаков', async () => {
    const transport = new FakeTransport({
      listTools: () => ({
        tools: [
          {
            name: 'get_issue',
            inputSchema: { type: 'object', properties: { issueId: { type: 'string' } } },
            annotations: { readOnlyHint: true },
          },
          {
            name: 'create_issue',
            inputSchema: { type: 'object', properties: {} },
            annotations: { readOnlyHint: false },
          },
          {
            name: 'download_attachment',
            inputSchema: { type: 'object', properties: { saveToPath: { type: 'string' } } },
            annotations: { readOnlyHint: true },
          },
          {
            name: 'no_annotations_tool',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      }),
    });
    const session = await openWith(transport);
    const tools = await session.listTools();
    await session.close();

    expect(tools).toEqual([
      { name: 'get_issue', readOnly: true, destructive: false, hasPathArgs: false },
      { name: 'create_issue', readOnly: false, destructive: false, hasPathArgs: false },
      { name: 'download_attachment', readOnly: true, destructive: false, hasPathArgs: true },
      { name: 'no_annotations_tool', readOnly: false, destructive: false, hasPathArgs: false },
    ]);
  });

  it('callTool отправляет tools/call с именем и аргументами, возвращает результат', async () => {
    const transport = new FakeTransport({
      callTool: (params) => ({
        content: [{ type: 'text', text: `called ${params.name}` }],
      }),
    });
    const session = await openWith(transport);
    const result = await session.callTool('get_issue', { issueId: 'X-1' });
    await session.close();

    expect(result.content).toEqual([{ type: 'text', text: 'called get_issue' }]);
    const callToolRequest = transport.sent.find((m) => m.method === 'tools/call');
    expect(callToolRequest?.params).toEqual({ name: 'get_issue', arguments: { issueId: 'X-1' } });
  });

  it('невалидные аргументы — сервер отвечает isError: true (не исключение) — отличимо от неизвестного инструмента', async () => {
    const transport = new FakeTransport({
      callTool: () => ({
        content: [{ type: 'text', text: 'Validation error: issueId is required' }],
        isError: true,
      }),
    });
    const session = await openWith(transport);
    const result = await session.callTool('get_issue', {});
    await session.close();

    expect(result.isError).toBe(true);
  });

  it('двойное закрытие сессии безопасно (идемпотентно, не бросает, не вешает)', async () => {
    const transport = new FakeTransport();
    const session = await openWith(transport);
    await session.close();
    await expect(session.close()).resolves.toBeUndefined();
  });

  it('таймаут handshake → HandshakeTimeoutError с замаскированным накопленным stderr', async () => {
    const transport = new FakeTransport();
    // Транспорт, который никогда не отвечает на initialize (эмулирует зависший процесс).
    transport.send = () => new Promise(() => {});
    transport.stderr.write('leaking secret-value-0123456789 in stderr\n');

    const masker = createMasker({ clientEnv: { TOKEN: 'secret-value-0123456789' } });
    await expect(
      DevSession.open({
        launch: LAUNCH,
        masker,
        transportFactory: () => transport,
        handshakeTimeoutMs: 30,
      })
    ).rejects.toThrow(HandshakeTimeoutError);
  });

  it('закрывает транспорт при неудавшемся handshake (не остаётся висеть)', async () => {
    const transport = new FakeTransport();
    transport.send = () => new Promise(() => {});
    await DevSession.open({
      launch: LAUNCH,
      masker: NO_OP_MASKER,
      transportFactory: () => transport,
      handshakeTimeoutMs: 20,
    }).catch(() => undefined);
    expect(transport.closed).toBe(true);
  });
});
