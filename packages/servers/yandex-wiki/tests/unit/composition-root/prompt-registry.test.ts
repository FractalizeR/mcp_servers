// tests/unit/composition-root/prompt-registry.test.ts
/**
 * Проверка DI-провода PromptRegistry (пакет 5.1.C.wiki, промпты):
 * composition root регистрирует ровно один провайдер с двумя промптами,
 * реестр отдаёт их через `prompts/list`, `prompts/get` подставляет
 * аргументы и валидирует обязательные, а неизвестное имя даёт
 * `ProtocolError(-32602)`.
 */
import { describe, it, expect } from 'vitest';
import { ProtocolError } from '@modelcontextprotocol/server';
import type { PromptRegistry } from '@fractalizer/mcp-core';
import { createContainer } from '../../../src/composition-root/container.js';
import { TYPES } from '../../../src/composition-root/types.js';
import type { ServerConfig } from '../../../src/config/index.js';
import { SECTION_SUMMARY, DOCUMENT_UPDATE_PREP } from '../../../src/prompts/index.js';

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

describe('composition-root: PromptRegistry wiring', () => {
  it('singleton: повторный get() возвращает тот же инстанс', async () => {
    const container = await createContainer(fakeConfig);
    const first = container.get<PromptRegistry>(TYPES.PromptRegistry);
    const second = container.get<PromptRegistry>(TYPES.PromptRegistry);
    expect(first).toBe(second);
  });

  it('prompts/list отдаёт оба промпта с описаниями и аргументами (DoD п.1)', async () => {
    const container = await createContainer(fakeConfig);
    const registry = container.get<PromptRegistry>(TYPES.PromptRegistry);

    const prompts = await registry.listPrompts();
    const names = prompts.map((p) => p.name).sort();
    expect(names).toEqual([DOCUMENT_UPDATE_PREP, SECTION_SUMMARY].sort());
    expect(prompts.every((p) => Boolean(p.description))).toBe(true);
    expect(prompts.every((p) => (p.arguments?.length ?? 0) > 0)).toBe(true);
  });

  it('два последовательных prompts/list побайтово идентичны (DoD п.4)', async () => {
    const container = await createContainer(fakeConfig);
    const registry = container.get<PromptRegistry>(TYPES.PromptRegistry);

    const first = JSON.stringify(await registry.listPrompts());
    const second = JSON.stringify(await registry.listPrompts());
    expect(first).toBe(second);
  });

  it('prompts/get подставляет аргументы (DoD п.2)', async () => {
    const container = await createContainer(fakeConfig);
    const registry = container.get<PromptRegistry>(TYPES.PromptRegistry);

    const result = await registry.getPrompt(SECTION_SUMMARY, { slug: 'team/backend' });
    expect(result.messages).toHaveLength(1);
    const [message] = result.messages;
    expect(message?.content.type).toBe('text');
    expect(message?.content.type === 'text' ? message.content.text : '').toContain('team/backend');
  });

  it('обязательный аргумент без значения — ProtocolError(-32602) (DoD п.2)', async () => {
    const container = await createContainer(fakeConfig);
    const registry = container.get<PromptRegistry>(TYPES.PromptRegistry);

    await expect(registry.getPrompt(SECTION_SUMMARY, {})).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ProtocolError);
      expect((error as ProtocolError).code).toBe(-32602);
      return true;
    });
  });

  it('несуществующее имя промпта — ProtocolError(-32602) (DoD п.3)', async () => {
    const container = await createContainer(fakeConfig);
    const registry = container.get<PromptRegistry>(TYPES.PromptRegistry);

    await expect(registry.getPrompt('does-not-exist', {})).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ProtocolError);
      expect((error as ProtocolError).code).toBe(-32602);
      return true;
    });
  });

  it('подготовка обновления документа: диф ПЕРЕД update_page (DoD п.5)', async () => {
    const container = await createContainer(fakeConfig);
    const registry = container.get<PromptRegistry>(TYPES.PromptRegistry);

    const result = await registry.getPrompt(DOCUMENT_UPDATE_PREP, { slug: 'a/b' });
    const [message] = result.messages;
    const text = message?.content.type === 'text' ? message.content.text : '';

    const diffIndex = text.indexOf('yw_diff_page');
    const updateIndex = text.lastIndexOf('yw_update_page');
    expect(diffIndex).toBeGreaterThan(-1);
    expect(updateIndex).toBeGreaterThan(diffIndex);
  });
});
