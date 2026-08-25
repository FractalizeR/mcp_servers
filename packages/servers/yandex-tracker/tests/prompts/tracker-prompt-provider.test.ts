/**
 * Unit-тесты TrackerPromptProvider и отдельных промптов (пакет 5.1.C.tracker
 * плана модернизации MCP 2026-07-28). Промпт `project_summary` удалён
 * 2026-08-25 вместе с легаси-семейством проектов (см. tracker-prompt-provider.ts).
 */

import { describe, it, expect } from 'vitest';
import { ProtocolError } from '@modelcontextprotocol/server';
import { TrackerPromptProvider } from '#prompts/tracker-prompt-provider.js';

/**
 * Достаёт JSON-RPC `code` из ошибки, брошенной `requireArgs()` —
 * пропущенный обязательный аргумент ОБЯЗАН давать `-32602` (Invalid params),
 * а не непрозрачную internal error. Хелпер, а не `.toThrow(...)`, потому что
 * vitest matcher сверяет только тип/сообщение, не произвольное поле `code`.
 */
function getProtocolErrorCode(fn: () => unknown): number | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    expect(error).toBeInstanceOf(ProtocolError);
    return (error as ProtocolError).code;
  }
}

describe('TrackerPromptProvider', () => {
  it('id === "tracker-prompts"', () => {
    expect(new TrackerPromptProvider().id).toBe('tracker-prompts');
  });

  it('listPrompts() отдаёт все 3 промпта плана с описаниями и аргументами', () => {
    const provider = new TrackerPromptProvider();
    const prompts = provider.listPrompts();

    expect(prompts.map((p) => p.name)).toEqual(['triage_queue', 'daily_summary', 'epic_links']);
    for (const prompt of prompts) {
      expect(prompt.description).toBeTruthy();
    }
  });

  it('listPrompts() детерминирован между вызовами (литеральный массив, не Map)', () => {
    const provider = new TrackerPromptProvider();
    expect(provider.listPrompts()).toEqual(provider.listPrompts());
  });

  it('getPrompt() возвращает undefined для неизвестного имени ("не мой промпт")', () => {
    const provider = new TrackerPromptProvider();
    expect(provider.getPrompt('does-not-exist')).toBeUndefined();
  });

  describe('triage_queue', () => {
    it('required: queue — без него бросает ProtocolError(-32602) с внятным сообщением', () => {
      const provider = new TrackerPromptProvider();
      expect(() => provider.getPrompt('triage_queue', {})).toThrow(/queue/);
      const code = getProtocolErrorCode(() => provider.getPrompt('triage_queue', {}));
      expect(code).toBe(-32602);
    });

    it('подставляет queue и focus в текст сообщения', () => {
      const provider = new TrackerPromptProvider();
      const result = provider.getPrompt('triage_queue', {
        queue: 'BACKEND',
        focus: 'без исполнителя',
      });
      expect(result).toBeDefined();
      const text = result?.messages[0]?.content.text ?? '';
      expect(text).toContain('BACKEND');
      expect(text).toContain('без исполнителя');
      expect(text).toContain('fr_yandex_tracker_find_issues');
    });

    it('работает без необязательного focus', () => {
      const provider = new TrackerPromptProvider();
      const result = provider.getPrompt('triage_queue', { queue: 'BACKEND' });
      expect(result?.messages).toHaveLength(1);
    });
  });

  describe('daily_summary', () => {
    it('без аргументов работает (assignee по умолчанию — me())', () => {
      const provider = new TrackerPromptProvider();
      const result = provider.getPrompt('daily_summary', undefined);
      expect(result).toBeDefined();
      expect(result?.messages[0]?.content.text).toContain('me()');
    });

    it('подставляет явно переданный assignee', () => {
      const provider = new TrackerPromptProvider();
      const result = provider.getPrompt('daily_summary', { assignee: 'ivanov' });
      expect(result?.messages[0]?.content.text).toContain('ivanov');
      expect(result?.messages[0]?.content.text).not.toContain('me()');
    });
  });

  describe('epic_links', () => {
    it('required: epic — без него бросает ProtocolError(-32602) с внятным сообщением', () => {
      const provider = new TrackerPromptProvider();
      expect(() => provider.getPrompt('epic_links', {})).toThrow(/epic/);
      const code = getProtocolErrorCode(() => provider.getPrompt('epic_links', {}));
      expect(code).toBe(-32602);
    });

    it('подставляет epic и ссылается на batch-инструменты', () => {
      const provider = new TrackerPromptProvider();
      const result = provider.getPrompt('epic_links', { epic: 'BACKEND-100' });
      const text = result?.messages[0]?.content.text ?? '';
      expect(text).toContain('BACKEND-100');
      expect(text).toContain('fr_yandex_tracker_get_issue_links');
      expect(text).toContain('fr_yandex_tracker_get_issues');
    });
  });
});
