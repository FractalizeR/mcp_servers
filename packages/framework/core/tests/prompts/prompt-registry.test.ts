/**
 * Тесты PromptRegistry (пакет 5.1.A плана модернизации MCP 2026-07-28).
 *
 * Покрывает DoD пакета:
 *  - агрегация нескольких провайдеров в детерминированном порядке (по id);
 *  - getPrompt опрашивает провайдеров по очереди и находит владельца имени;
 *  - подстановка аргументов в сообщения (ответственность провайдера, но
 *    сквозь реестр);
 *  - несуществующий промпт → ProtocolError(-32602) (см. prompts.wire.test.ts
 *    для проверки, что SDK сериализует именно этот код на wire);
 *  - пустой реестр отвечает пустым списком, а не ошибкой.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProtocolError } from '@modelcontextprotocol/server';
import { PromptRegistry } from '../../src/prompts/prompt-registry.js';
import type {
  PromptProvider,
  McpPrompt,
  PromptGetResult,
} from '../../src/prompts/prompt-provider.js';

/** Провайдер-заглушка: фиксированный список промптов + один параметризуемый. */
class FakePromptProvider implements PromptProvider {
  constructor(
    public readonly id: string,
    private readonly prompts: readonly McpPrompt[]
  ) {}

  listPrompts(): readonly McpPrompt[] {
    return this.prompts;
  }

  getPrompt(name: string, args?: Readonly<Record<string, string>>): PromptGetResult | undefined {
    const prompt = this.prompts.find((p) => p.name === name);
    if (!prompt) {
      return undefined;
    }
    const queue = args?.['queue'] ?? '(не указана)';
    return {
      description: `Построено провайдером ${this.id}`,
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: `Триаж очереди ${queue}` },
        },
      ],
    };
  }
}

describe('PromptRegistry', () => {
  let registry: PromptRegistry;
  let providerA: FakePromptProvider;
  let providerB: FakePromptProvider;

  beforeEach(() => {
    registry = new PromptRegistry();

    providerA = new FakePromptProvider('a-provider', [
      { name: 'triage', description: 'Triage очереди', arguments: [{ name: 'queue' }] },
    ]);
    providerB = new FakePromptProvider('b-provider', [{ name: 'daily', description: 'Дейли' }]);

    registry.register(providerA);
    registry.register(providerB);
  });

  it('пустой реестр отвечает пустым списком промптов, а не ошибкой', async () => {
    const empty = new PromptRegistry();
    await expect(empty.listPrompts()).resolves.toEqual([]);
  });

  it('пустой реестр: getPrompt любого имени → ProtocolError(-32602)', async () => {
    const empty = new PromptRegistry();
    await expect(empty.getPrompt('whatever')).rejects.toMatchObject({ code: -32602 });
    await expect(empty.getPrompt('whatever')).rejects.toBeInstanceOf(ProtocolError);
  });

  it('listPrompts конкатенирует провайдеров в детерминированном порядке (сортировка по id)', async () => {
    const prompts = await registry.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual(['triage', 'daily']);
  });

  it('два последовательных listPrompts дают побайтово идентичный результат', async () => {
    const first = await registry.listPrompts();
    const second = await registry.listPrompts();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('getPrompt опрашивает провайдеров по очереди и находит владельца имени', async () => {
    const result = await registry.getPrompt('daily');
    expect(result.description).toBe('Построено провайдером b-provider');
  });

  it('getPrompt подставляет аргументы в сообщения', async () => {
    const result = await registry.getPrompt('triage', { queue: 'BACKEND' });
    expect(result.messages).toEqual([
      { role: 'user', content: { type: 'text', text: 'Триаж очереди BACKEND' } },
    ]);
  });

  it('getPrompt без аргументов использует дефолт провайдера', async () => {
    const result = await registry.getPrompt('triage');
    expect(result.messages[0]?.content).toEqual({
      type: 'text',
      text: 'Триаж очереди (не указана)',
    });
  });

  it('getPrompt несуществующего имени → ProtocolError(-32602)', async () => {
    await expect(registry.getPrompt('nowhere')).rejects.toMatchObject({ code: -32602 });
    await expect(registry.getPrompt('nowhere')).rejects.toBeInstanceOf(ProtocolError);
  });

  it('register с уже занятым id — ошибка конфигурации, не тихая перезапись', () => {
    expect(() => registry.register(providerA)).toThrowError(/уже зарегистрирован/);
  });
});
