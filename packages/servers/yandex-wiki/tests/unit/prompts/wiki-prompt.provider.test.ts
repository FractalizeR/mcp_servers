// tests/unit/prompts/wiki-prompt.provider.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ProtocolError } from '@modelcontextprotocol/server';
import {
  WikiPromptProvider,
  SECTION_SUMMARY,
  DOCUMENT_UPDATE_PREP,
} from '../../../src/prompts/wiki-prompt.provider.js';

function textOf(result: {
  messages: readonly { content: { type: string; text?: string } }[];
}): string {
  const [message] = result.messages;
  return message?.content.type === 'text' ? (message.content.text ?? '') : '';
}

describe('WikiPromptProvider', () => {
  let provider: WikiPromptProvider;

  beforeEach(() => {
    provider = new WikiPromptProvider();
  });

  it('id — стабильный идентификатор провайдера', () => {
    expect(provider.id).toBe('wiki-prompts');
  });

  describe('listPrompts (DoD п.1)', () => {
    it('отдаёт оба промпта с описаниями и аргументами', () => {
      const prompts = provider.listPrompts();
      expect(prompts).toHaveLength(2);

      const summary = prompts.find((p) => p.name === SECTION_SUMMARY);
      expect(summary).toBeDefined();
      expect(summary?.description).toBeTruthy();
      expect(summary?.arguments).toEqual([
        expect.objectContaining({ name: 'slug', required: true }),
      ]);

      const prep = prompts.find((p) => p.name === DOCUMENT_UPDATE_PREP);
      expect(prep).toBeDefined();
      expect(prep?.description).toBeTruthy();
      expect(prep?.arguments?.map((a) => a.name)).toEqual(['slug', 'instructions']);
      expect(prep?.arguments?.find((a) => a.name === 'slug')?.required).toBe(true);
      expect(prep?.arguments?.find((a) => a.name === 'instructions')?.required).toBe(false);
    });

    it('два последовательных вызова побайтово идентичны (DoD п.4)', () => {
      const first = JSON.stringify(provider.listPrompts());
      const second = JSON.stringify(provider.listPrompts());
      expect(first).toBe(second);
    });
  });

  describe('getPrompt — не мой промпт', () => {
    it('неизвестное имя — undefined (не ошибка на уровне провайдера)', () => {
      expect(provider.getPrompt('does-not-exist', {})).toBeUndefined();
    });
  });

  describe(`getPrompt(${SECTION_SUMMARY})`, () => {
    it('подставляет slug в текст промпта', () => {
      const result = provider.getPrompt(SECTION_SUMMARY, { slug: 'team/backend' });
      expect(result).toBeDefined();
      expect(result?.description).toContain('team/backend');
      expect(textOf(result!)).toContain('team/backend');
      expect(textOf(result!)).toContain('yw_get_page');
      expect(textOf(result!)).toContain('yw_get_resources');
    });

    it('явно запрещает write-инструменты (read-only сводка)', () => {
      const result = provider.getPrompt(SECTION_SUMMARY, { slug: 'x' });
      expect(textOf(result!)).toMatch(/НЕ вызывай/);
    });

    it('обязательный slug не передан — внятная ошибка -32602 (DoD п.2)', () => {
      expect(() => provider.getPrompt(SECTION_SUMMARY, {})).toThrow(ProtocolError);
      try {
        provider.getPrompt(SECTION_SUMMARY, {});
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ProtocolError);
        expect((error as ProtocolError).code).toBe(-32602);
        expect((error as ProtocolError).message).toContain('slug');
      }
    });

    it('обязательный slug отсутствует как аргумент вовсе (args=undefined) — та же ошибка', () => {
      expect(() => provider.getPrompt(SECTION_SUMMARY, undefined)).toThrow(ProtocolError);
    });

    it('пустая строка в slug — тоже ошибка (не пропускаем "тихий" пустой аргумент)', () => {
      expect(() => provider.getPrompt(SECTION_SUMMARY, { slug: '   ' })).toThrow(ProtocolError);
    });
  });

  describe(`getPrompt(${DOCUMENT_UPDATE_PREP})`, () => {
    it('без instructions — валидный результат, обязательный шаг diff присутствует', () => {
      const result = provider.getPrompt(DOCUMENT_UPDATE_PREP, { slug: 'users/docs/readme' });
      expect(result).toBeDefined();
      expect(textOf(result!)).toContain('users/docs/readme');
      expect(textOf(result!)).toContain('yw_diff_page');
      expect(textOf(result!)).toContain('yw_update_page');
    });

    it('с instructions — включает их текст в промпт', () => {
      const result = provider.getPrompt(DOCUMENT_UPDATE_PREP, {
        slug: 'a/b',
        instructions: 'добавить раздел FAQ в конец страницы',
      });
      expect(textOf(result!)).toContain('добавить раздел FAQ в конец страницы');
    });

    it('направляет СНАЧАЛА посмотреть diff, ПОТОМ вызывать update_page (DoD п.5)', () => {
      const result = provider.getPrompt(DOCUMENT_UPDATE_PREP, { slug: 'x' });
      const text = textOf(result!);
      const diffIndex = text.indexOf('yw_diff_page');
      const updateIndex = text.lastIndexOf('yw_update_page');

      expect(diffIndex).toBeGreaterThan(-1);
      expect(updateIndex).toBeGreaterThan(-1);
      expect(diffIndex).toBeLessThan(updateIndex);
    });

    it('предупреждает, что update_page необратим (нет recovery_token)', () => {
      const result = provider.getPrompt(DOCUMENT_UPDATE_PREP, { slug: 'x' });
      expect(textOf(result!)).toMatch(/recovery_token/);
    });

    it('обязательный slug не передан — внятная ошибка -32602 (DoD п.2)', () => {
      try {
        provider.getPrompt(DOCUMENT_UPDATE_PREP, { instructions: 'что-то' });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ProtocolError);
        expect((error as ProtocolError).code).toBe(-32602);
      }
    });
  });
});
