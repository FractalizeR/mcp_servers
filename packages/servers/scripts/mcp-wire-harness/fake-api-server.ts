/**
 * Подставной локальный HTTP API для сценариев сбоев транспорта.
 *
 * Реальный бандл сервера нельзя подменить моком (чужой процесс), поэтому
 * вместо реального API ему подсовывается локальный `http.Server`, на который
 * сервер направляется через переменную окружения с базовым URL API. Handler
 * получает номер вызова (с единицы) — это позволяет сценарию retry ответить
 * по-разному на 1-ю и 2-ю попытку без маршрутизации по путям (в каждом
 * сценарии подставной сервер обслуживает ровно один вызываемый tool).
 */

import * as http from 'node:http';
import type { Socket } from 'node:net';

export interface FakeApiRequest {
  method: string;
  path: string;
  bodyRaw: string;
}

export type FakeApiHandler = (
  request: FakeApiRequest,
  res: http.ServerResponse,
  callIndex: number
) => void;

export class FakeApiServer {
  private readonly server: http.Server;
  private readonly sockets = new Set<Socket>();
  readonly requests: FakeApiRequest[] = [];

  constructor(private readonly handler: FakeApiHandler) {
    this.server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const request: FakeApiRequest = {
          method: req.method ?? '',
          path: (req.url ?? '').split('?')[0] ?? '',
          bodyRaw: Buffer.concat(chunks).toString('utf8'),
        };
        this.requests.push(request);
        this.handler(request, res, this.requests.length);
      });
    });
    this.server.on('connection', (socket: Socket) => {
      this.sockets.add(socket);
      socket.on('close', () => this.sockets.delete(socket));
    });
  }

  /** Запускает сервер на свободном порту, возвращает его базовый URL. */
  async start(): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    const address = this.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('FakeApiServer: не удалось определить порт (server.address())');
    }
    return `http://127.0.0.1:${address.port}`;
  }

  /**
   * Останавливает сервер. Форсированно рвёт зависшие сокеты (сценарий
   * «таймаут» держит соединение открытым бесконечно — обычно к этому моменту
   * axios уже сам оборвал его, но не полагаемся на это).
   */
  async stop(): Promise<void> {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

/** Отправляет JSON-ответ с корректным Content-Type/Content-Length. */
export function sendJson(res: http.ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}
