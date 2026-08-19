/**
 * Заглушка `Transport` для тестов `DevSession` без реального спавна процесса.
 *
 * Отвечает на JSON-RPC `initialize` минимально достаточным `InitializeResult`
 * (legacy-эпоха, `protocolVersion: '2025-11-25'`), на `tools/list`/`tools/call`
 * — заданными в конструкторе обработчиками. Ничего не знает о дочернем
 * процессе — это и есть требование пакета «фабрика транспорта инъецируется».
 */

import type { JSONRPCMessage, MessageExtraInfo, Transport } from '@modelcontextprotocol/client';
import { PassThrough } from 'node:stream';

const LEGACY_PROTOCOL_VERSION = '2025-11-25';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: unknown;
}

export interface FakeTransportHandlers {
  listTools?: () => unknown;
  callTool?: (params: { name: string; arguments?: unknown }) => unknown;
}

export class FakeTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(message: T, extra?: MessageExtraInfo) => void;

  readonly sent: JsonRpcRequest[] = [];
  /** Поток, эмулирующий stderr дочернего процесса (для тестов захвата stderr). */
  readonly stderr = new PassThrough();
  closed = false;

  constructor(private readonly handlers: FakeTransportHandlers = {}) {}

  start(): Promise<void> {
    return Promise.resolve();
  }

  send(message: JSONRPCMessage): Promise<void> {
    if (!('method' in message)) {
      // Клиент шлёт только запросы и уведомления; ответ сюда прийти не может.
      return Promise.resolve();
    }
    this.sent.push(message);
    const response = this.buildResponse(message);
    if (response) {
      queueMicrotask(() => this.onmessage?.(response as JSONRPCMessage));
    }
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.closed = true;
    this.onclose?.();
    return Promise.resolve();
  }

  /**
   * Обработчики намеренно отдают `unknown` — тесты подсовывают в том числе
   * заведомо неправильные payload'ы, поэтому результат не типизируется здесь,
   * а приводится на выходе (см. `send`): это и есть граница «сервер вернул
   * что угодно», которую фейк изображает.
   */
  private buildResponse(message: JsonRpcRequest): unknown {
    if (message.id === undefined) return undefined; // notification — без ответа
    switch (message.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: LEGACY_PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name: 'fake-mcp-server', version: '0.0.0-test' },
          },
        };
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: this.handlers.listTools?.() ?? { tools: [] },
        };
      case 'tools/call':
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: this.handlers.callTool?.(
            message.params as { name: string; arguments?: unknown }
          ) ?? { content: [] },
        };
      default:
        return { jsonrpc: '2.0', id: message.id, result: {} };
    }
  }
}
