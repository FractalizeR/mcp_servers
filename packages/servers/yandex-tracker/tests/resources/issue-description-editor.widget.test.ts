/**
 * Прогон JS виджета MCP Apps в реальном DOM с фальшивым хостом.
 *
 * Зачем именно так: статические проверки бандла (URI, mimeType, CSP, размер)
 * пропустили молчаливый отказ — виджет звал `update_issue` вместо
 * `fr_yandex_tracker_update_issue`, и кнопка «применить» не работала ни разу.
 * Форму сообщений на постмессадж-канале нельзя проверить, не выполнив скрипт.
 *
 * Фальшивый хост = сам jsdom-window: в top-level документе `window.parent`
 * это тот же window, поэтому перехваченный `postMessage` ловит исходящие
 * сообщения виджета, а входящие мы доставляем `MessageEvent` с
 * `source: window` — ровно то, что виджет и требует от отправителя.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import type { DOMWindow } from 'jsdom';
import { buildIssueDescriptionEditorHtml } from '#resources/issue-description-editor.widget.js';
import { UPDATE_ISSUE_TOOL_METADATA } from '#tools/api/issues/update/update-issue.metadata.js';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';

interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { code?: number; message?: string };
}

/** Хендшейк по таймауту должен успевать в пределах теста, а не 3 секунд прода. */
const TEST_INITIALIZE_TIMEOUT_MS = 20;

const ANALYZE_RESULT = {
  structuredContent: {
    success: true,
    data: {
      issueId: 'TEST-12',
      currentDescription: '<{Детали\nвнутри cut-блока\n}>\nЕсли latency < 200 — ок.',
      suggestedDescription:
        '<{Детали\nвнутри cut-блока\n}>\nЕсли latency < 200 — ок.\n\n## Контекст',
      notes: ['Не хватает разделов: Контекст.'],
      version: 7,
    },
  },
};

class FakeHost {
  readonly sent: JsonRpcMessage[] = [];
  private readonly dom: JSDOM;

  constructor(
    options: {
      initializeTimeoutMs?: number;
      requestTimeoutMs?: number;
      toolNames?: { updateIssue?: string };
    } = {}
  ) {
    const html = buildIssueDescriptionEditorHtml(
      options.toolNames ?? { updateIssue: UPDATE_ISSUE_TOOL_METADATA.name },
      {
        initializeTimeoutMs: options.initializeTimeoutMs ?? TEST_INITIALIZE_TIMEOUT_MS,
        ...(options.requestTimeoutMs !== undefined && {
          requestTimeoutMs: options.requestTimeoutMs,
        }),
      }
    );
    const sent = this.sent;
    this.dom = new JSDOM(html, {
      runScripts: 'dangerously',
      beforeParse(window): void {
        window.postMessage = (message: unknown): void => {
          sent.push(message as JsonRpcMessage);
        };
        // jsdom не реализует ResizeObserver. Заглушка обязана вызывать колбэк
        // при observe(), как это делают браузеры: инертная заглушка оставляла
        // ветку отчёта о размере неисполненной, и тест выглядел сильнее, чем был.
        (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
          constructor(private readonly callback: () => void) {}
          observe(): void {
            this.callback();
          }
          disconnect(): void {}
        };
      },
    });
  }

  get document(): Document {
    return this.dom.window.document;
  }

  close(): void {
    this.dom.window.close();
  }

  /** Доставляет сообщение виджету от имени хоста. */
  deliver(message: JsonRpcMessage): void {
    this.dispatchFrom(this.dom.window, message);
  }

  /** `source` — окно-отправитель: виджет обязан отбросить всё, кроме своего хоста. */
  dispatchFrom(source: DOMWindow, message: JsonRpcMessage): void {
    const { window } = this.dom;
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: message,
        source: source as unknown as MessageEventSource,
      })
    );
  }

  /** Собирает необработанные исключения окна — исключение в listener не виднó иначе. */
  captureWindowErrors(): string[] {
    const errors: string[] = [];
    this.dom.window.addEventListener('error', (event: ErrorEvent) => {
      errors.push(event.message);
    });
    return errors;
  }

  /** Ждёт N-й по счёту `tools/call` от виджета. */
  async waitForCall(count: number): Promise<JsonRpcMessage> {
    await waitUntil(
      () => this.sent.filter((message) => message.method === 'tools/call').length >= count
    );
    const calls = this.sent.filter((message) => message.method === 'tools/call');
    return calls[count - 1] as JsonRpcMessage;
  }

  /** Ждёт ответ виджета на запрос хоста с этим id. */
  async waitForResponse(id: number): Promise<JsonRpcMessage> {
    for (let attempt = 0; attempt < 50; attempt++) {
      const found = this.sent.find(
        (message) =>
          message.id === id && (message.result !== undefined || message.error !== undefined)
      );
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error(`Виджет не ответил на запрос ${id}`);
  }

  /** Ждёт сообщение виджета по методу — скрипт отвечает асинхронно (промисы). */
  async waitFor(method: string): Promise<JsonRpcMessage> {
    for (let attempt = 0; attempt < 50; attempt++) {
      const found = this.sent.find((message) => message.method === method);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error(`Виджет не отправил ${method}; отправлено: ${JSON.stringify(this.sent)}`);
  }

  /** Отвечает на `ui/initialize` и дожидается завершения хендшейка. */
  async completeHandshake(
    hostCapabilities: Record<string, unknown> = { serverTools: {} }
  ): Promise<void> {
    const initialize = await this.waitFor('ui/initialize');
    this.deliver({
      jsonrpc: '2.0',
      id: initialize.id as number,
      result: { hostInfo: { name: 'fake-host', version: '1' }, hostCapabilities },
    });
    await this.waitFor('ui/notifications/initialized');
  }

  element<T extends Element>(id: string): T {
    const node = this.document.getElementById(id);
    if (node === null) throw new Error(`Нет элемента #${id}`);
    return node as unknown as T;
  }
}

/** Ждёт выполнения условия — состояние меняется в обработчиках и промисах виджета. */
async function waitUntil(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Условие не выполнилось за отведённое время');
}

let host: FakeHost | undefined;

afterEach(() => {
  host?.close();
  host = undefined;
});

describe('Виджет ui://tracker/issue-description-editor: протокол SEP-1865', () => {
  it('шлёт ui/initialize и завершает хендшейк ui/notifications/initialized', async () => {
    host = new FakeHost();
    const initialize = await host.waitFor('ui/initialize');

    expect(initialize.id).toBeTypeOf('number');
    expect(initialize.params?.['appInfo']).toBeDefined();
    const capabilities = initialize.params?.['appCapabilities'] as Record<string, unknown>;
    expect(capabilities['availableDisplayModes']).toEqual(['inline']);
    // Капабилити tools обязывает реализовать tools/list и tools/call от хоста.
    expect(capabilities['tools']).toBeUndefined();

    await host.completeHandshake();
  });

  it('молчащий хост не подвешивает виджет: initialized уходит по таймауту', async () => {
    host = new FakeHost({ initializeTimeoutMs: 10 });
    await host.waitFor('ui/notifications/initialized');
  });

  it('отвечает на ui/resource-teardown — иначе хост ждёт таймаута перед сносом', async () => {
    host = new FakeHost();
    await host.completeHandshake();

    host.deliver({
      jsonrpc: '2.0',
      id: 777,
      method: 'ui/resource-teardown',
      params: { reason: 'user' },
    });

    const response = await host.waitForResponse(777);
    expect(response.result).toEqual({});
  });

  it('игнорирует сообщения не от своего хоста', async () => {
    host = new FakeHost();
    await host.completeHandshake();
    const before = host.sent.length;

    const foreign = new JSDOM('').window;
    host.dispatchFrom(foreign, { jsonrpc: '2.0', id: 42, method: 'ui/resource-teardown' });

    expect(host.sent.length).toBe(before);
  });
});

describe('Виджет ui://tracker/issue-description-editor: данные и правка', () => {
  it('рендерит tool-result, не исполняя разметку из description', async () => {
    host = new FakeHost();
    await host.completeHandshake();

    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });

    const current = host.element<HTMLTextAreaElement>('current');
    expect(current.value).toBe(ANALYZE_RESULT.structuredContent.data.currentDescription);
    expect(host.element<HTMLElement>('issue').textContent).toContain('TEST-12');
    expect(host.element<HTMLElement>('notes').children).toHaveLength(1);
    // Разметка из данных Трекера осталась текстом: новых узлов не появилось.
    expect(host.document.querySelectorAll('script')).toHaveLength(2);
    expect(host.element<HTMLButtonElement>('apply').disabled).toBe(false);
  });

  it('«Применить» зовёт инструмент под полным именем с префиксом сервера', async () => {
    host = new FakeHost();
    await host.completeHandshake();
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });

    host.element<HTMLButtonElement>('apply').click();
    const call = await host.waitFor('tools/call');

    expect(call.params?.['name']).toBe(UPDATE_ISSUE_TOOL_METADATA.name);
    expect(call.params?.['arguments']).toMatchObject({
      issueId: 'TEST-12',
      description: ANALYZE_RESULT.structuredContent.data.suggestedDescription,
      version: 7,
    });
  });

  it('имя инструмента правки существует в реестре инструментов сервера', () => {
    const registered = TOOL_CLASSES.map((tool) => tool.METADATA.name);
    expect(registered).toContain(UPDATE_ISSUE_TOOL_METADATA.name);
  });

  it('хост без serverTools блокирует кнопку вместо отказа в момент клика', async () => {
    host = new FakeHost();
    await host.completeHandshake({});
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });

    expect(host.element<HTMLButtonElement>('apply').disabled).toBe(true);
    expect(host.element<HTMLElement>('status').textContent).toMatch(/не умеет/i);
    expect(host.sent.some((message) => message.method === 'tools/call')).toBe(false);
  });

  it('ошибка анализа после tool-input не включает кнопку на пустой форме', async () => {
    host = new FakeHost();
    await host.completeHandshake();

    // Именно этот порядок и был дырой: issueId уже известен из tool-input,
    // данных нет, и клик отправил бы в задачу пустое описание.
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-input',
      params: { arguments: { issueId: 'TEST-12' } },
    });
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: { isError: true, content: [{ type: 'text', text: 'boom' }] },
    });

    expect(host.element<HTMLElement>('status').textContent).toMatch(/не выполнен/i);
    expect(host.element<HTMLTextAreaElement>('suggested').value).toBe('');
    expect(host.element<HTMLButtonElement>('apply').disabled).toBe(true);
  });

  it('отменённый вызов виден в интерфейсе', async () => {
    host = new FakeHost();
    await host.completeHandshake();

    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-cancelled',
      params: { reason: 'пользователь остановил' },
    });

    expect(host.element<HTMLElement>('issue').textContent).toContain('пользователь остановил');
  });

  it('применяет тему и переменные хоста, игнорируя посторонние ключи', async () => {
    host = new FakeHost();
    await host.completeHandshake();

    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/host-context-changed',
      params: {
        theme: 'dark',
        styles: { variables: { '--color-text-primary': 'rgb(1, 2, 3)', 'color-scheme': 'light' } },
      },
    });

    const root = host.document.documentElement;
    expect(root.style.getPropertyValue('--color-text-primary')).toBe('rgb(1, 2, 3)');
    expect(root.style.getPropertyValue('color-scheme')).toBe('dark');
  });

  it('сообщает хосту свой размер', async () => {
    host = new FakeHost();
    await host.completeHandshake();
    const sizeChanged = await host.waitFor('ui/notifications/size-changed');

    expect(sizeChanged.params).toHaveProperty('width');
    expect(sizeChanged.params).toHaveProperty('height');
  });
});

describe('Виджет ui://tracker/issue-description-editor: состояние и границы', () => {
  it('не шлёт ничего хосту до завершения хендшейка', async () => {
    host = new FakeHost({ initializeTimeoutMs: 5000 });
    await host.waitFor('ui/initialize');

    // ResizeObserver уже сработал при observe(); отчёт о размере обязан ждать
    // initialized — хост не принимает сообщения раньше (SEP-1865, Sandbox proxy).
    expect(host.sent.map((message) => message.method)).toEqual(['ui/initialize']);
  });

  it('на неизвестный запрос хоста отвечает -32601, а не молчит', async () => {
    host = new FakeHost();
    await host.completeHandshake();

    host.deliver({ jsonrpc: '2.0', id: 501, method: 'tools/list' });

    const response = await host.waitForResponse(501);
    expect(response.error?.code).toBe(-32601);
  });

  it('отвечает на ping хоста', async () => {
    host = new FakeHost();
    await host.completeHandshake();

    host.deliver({ jsonrpc: '2.0', id: 502, method: 'ping' });

    expect((await host.waitForResponse(502)).result).toEqual({});
  });

  it('результат чужого инструмента не затирает форму, но обновляет версию', async () => {
    host = new FakeHost();
    await host.completeHandshake();
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });

    // Хост шлёт tool-result и на вызовы самого виджета — здесь ответ update_issue.
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        structuredContent: {
          success: true,
          data: { issueId: 'TEST-12', updatedFields: ['description'], issue: { version: 8 } },
        },
      },
    });

    const current = host.element<HTMLTextAreaElement>('current');
    expect(current.value).toBe(ANALYZE_RESULT.structuredContent.data.currentDescription);

    host.element<HTMLButtonElement>('apply').click();
    const call = await host.waitFor('tools/call');
    expect(call.params?.['arguments']).toMatchObject({ version: 8 });
  });

  it('после сохранения берёт новую версию из ответа — второе сохранение не конфликтует', async () => {
    host = new FakeHost();
    await host.completeHandshake();
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });

    host.element<HTMLButtonElement>('apply').click();
    const first = await host.waitFor('tools/call');
    expect(first.params?.['arguments']).toMatchObject({ version: 7, fields: ['key', 'version'] });

    host.deliver({
      jsonrpc: '2.0',
      id: first.id as number,
      result: {
        structuredContent: {
          success: true,
          data: { issueId: 'TEST-12', updatedFields: ['description'], issue: { version: 8 } },
        },
      },
    });
    await waitUntil(() => host?.element<HTMLElement>('status').textContent === 'Сохранено');

    host.element<HTMLButtonElement>('apply').click();
    const second = await host.waitForCall(2);
    expect(second.params?.['arguments']).toMatchObject({ version: 8 });
  });

  it('молчание хоста на tools/call не оставляет кнопку заблокированной навсегда', async () => {
    host = new FakeHost({ requestTimeoutMs: 30 });
    await host.completeHandshake();
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });

    host.element<HTMLButtonElement>('apply').click();
    await host.waitFor('tools/call');

    await waitUntil(() => host?.element<HTMLButtonElement>('apply').disabled === false);
    expect(host.element<HTMLElement>('status').textContent).toMatch(/не ответил/i);
  });

  it('опоздавший ответ на ui/initialize всё равно применяется', async () => {
    host = new FakeHost({ initializeTimeoutMs: 10 });
    const initialize = await host.waitFor('ui/initialize');
    await host.waitFor('ui/notifications/initialized');

    host.deliver({
      jsonrpc: '2.0',
      id: initialize.id as number,
      result: { hostCapabilities: {}, hostContext: { theme: 'dark' } },
    });

    await waitUntil(
      () => host?.document.documentElement.style.getPropertyValue('color-scheme') === 'dark'
    );
    // Капабилити из опоздавшего ответа тоже учтены: serverTools нет.
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });
    expect(host.element<HTMLButtonElement>('apply').disabled).toBe(true);
  });

  it('разметка из description не превращается в узлы DOM', async () => {
    host = new FakeHost();
    await host.completeHandshake();
    const hostile = '<script>alert(1)</script><img src=x onerror=alert(2)>';

    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        structuredContent: {
          success: true,
          data: {
            issueId: 'TEST-1',
            currentDescription: hostile,
            suggestedDescription: hostile,
            notes: [hostile],
          },
        },
      },
    });

    expect(host.element<HTMLTextAreaElement>('current').value).toBe(hostile);
    // Значимая часть проверки — список заметок: он строится узлами, и именно
    // там innerHTML превратил бы текст в разметку (у textarea .value не парсится).
    const notes = host.element<HTMLElement>('notes');
    expect(notes.children).toHaveLength(1);
    expect(notes.children[0]?.tagName).toBe('LI');
    expect(notes.children[0]?.childNodes).toHaveLength(1);
    expect(notes.children[0]?.textContent).toBe(hostile);
    expect(host.document.querySelectorAll('img')).toHaveLength(0);
    // Ровно два скрипта бандла: конфиг и код виджета, новых не появилось.
    expect(host.document.querySelectorAll('script')).toHaveLength(2);
  });
});

describe('Виджет ui://tracker/issue-description-editor: защита данных задачи', () => {
  it('повторный анализ той же задачи не стирает правки человека и не откатывает версию', async () => {
    host = new FakeHost();
    await host.completeHandshake();
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });

    const suggested = host.element<HTMLTextAreaElement>('suggested');
    suggested.value = 'текст, который печатал человек';
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        structuredContent: {
          success: true,
          data: { ...ANALYZE_RESULT.structuredContent.data, version: 3 },
        },
      },
    });

    expect(suggested.value).toBe('текст, который печатал человек');
    host.element<HTMLButtonElement>('apply').click();
    const call = await host.waitFor('tools/call');
    expect(call.params?.['arguments']).toMatchObject({ version: 7 });
  });

  it('анализ другой задачи перерисовывает форму целиком', async () => {
    host = new FakeHost();
    await host.completeHandshake();
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });
    host.element<HTMLTextAreaElement>('suggested').value = 'правка первой задачи';

    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        structuredContent: {
          success: true,
          data: {
            issueId: 'OTHER-1',
            currentDescription: 'другое описание',
            suggestedDescription: 'другое предложение',
            notes: [],
            version: 2,
          },
        },
      },
    });

    expect(host.element<HTMLTextAreaElement>('suggested').value).toBe('другое предложение');
    host.element<HTMLButtonElement>('apply').click();
    const call = await host.waitFor('tools/call');
    expect(call.params?.['arguments']).toMatchObject({ issueId: 'OTHER-1', version: 2 });
  });

  it('текст ошибки инструмента доходит до пользователя дословно', async () => {
    host = new FakeHost();
    await host.completeHandshake();
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });

    host.element<HTMLButtonElement>('apply').click();
    const call = await host.waitFor('tools/call');
    host.deliver({
      jsonrpc: '2.0',
      id: call.id as number,
      result: { isError: true, content: [{ type: 'text', text: 'Конфликт версий задачи' }] },
    });

    await waitUntil(() =>
      /Конфликт версий/.test(host?.element<HTMLElement>('status').textContent ?? '')
    );
  });

  it('без имени инструмента правки кнопка выключена и вызова не будет', async () => {
    host = new FakeHost({ toolNames: {} });
    await host.completeHandshake();
    host.deliver({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: ANALYZE_RESULT,
    });

    expect(host.element<HTMLButtonElement>('apply').disabled).toBe(true);
    expect(host.element<HTMLElement>('status').textContent).toMatch(/отключена настройками/i);
  });

  it('ответ с id из ключей Object.prototype не вызывает исключения в обработчике', async () => {
    host = new FakeHost();
    await host.completeHandshake();

    // pending как обычный объект отдал бы на ключ "constructor" функцию Object,
    // и обработчик попытался бы вызвать её .resolve — TypeError на каждом
    // таком сообщении. Слушатель ошибок окна — единственный наблюдаемый след:
    // сам listener исключение переживает.
    const errors = host.captureWindowErrors();
    host.deliver({ jsonrpc: '2.0', id: 'constructor' as unknown as number, result: {} });
    host.deliver({ jsonrpc: '2.0', id: 601, method: 'ping' });

    expect((await host.waitForResponse(601)).result).toEqual({});
    expect(errors).toEqual([]);
  });
});
