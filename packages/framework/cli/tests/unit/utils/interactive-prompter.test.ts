/**
 * Тесты InteractivePrompter.
 *
 * inquirer мокаем целиком; проверяем что промпты собираются с корректными
 * полями (validate / default / mask / when / choices), и что static-методы
 * (promptClientSelection, promptConfirmation, promptSelection) корректно
 * передают ответы.
 *
 * После Stage 1.1 нет вызова promptConfirmation('Сохранить...') в connect-команде —
 * соответствующий тест для prompter не требуется.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractivePrompter } from '../../../src/utils/interactive-prompter.js';
import type { ConfigPromptDefinition, MCPClientInfo } from '../../../src/types.js';

const inquirerPromptMock = vi.hoisted(() => vi.fn());

vi.mock('inquirer', () => ({
  default: { prompt: inquirerPromptMock },
}));

interface Cfg {
  token: string;
  orgId: string;
  port?: number;
}

describe('InteractivePrompter', () => {
  beforeEach(() => {
    inquirerPromptMock.mockReset();
  });

  describe('promptServerConfig', () => {
    it('преобразует прости промпты в формат inquirer', async () => {
      const prompts: ConfigPromptDefinition<Cfg>[] = [
        { name: 'token', type: 'password', message: 'Token:' },
        { name: 'orgId', type: 'input', message: 'Org ID:' },
      ];
      inquirerPromptMock.mockResolvedValue({ token: 't', orgId: 'o' });

      const p = new InteractivePrompter<Cfg>(prompts);
      const result = await p.promptServerConfig();

      expect(result).toEqual({ token: 't', orgId: 'o' });
      const passedQuestions = inquirerPromptMock.mock.calls[0]?.[0] as Array<
        Record<string, unknown>
      >;
      expect(passedQuestions).toHaveLength(2);
      expect(passedQuestions?.[0]?.['type']).toBe('password');
      expect(passedQuestions?.[0]?.['mask']).toBe('*');
      expect(passedQuestions?.[1]?.['type']).toBe('input');
    });

    it('передаёт validate, choices и when', async () => {
      const prompts: ConfigPromptDefinition<Cfg>[] = [
        {
          name: 'orgId',
          type: 'select',
          message: 'Choose org',
          choices: [{ name: 'Org 1', value: 'org-1' }],
          validate: (v) => (typeof v === 'string' && v.length > 0 ? true : 'empty'),
          when: (answers) => answers.token !== undefined,
        },
      ];
      inquirerPromptMock.mockResolvedValue({ orgId: 'org-1' });

      const p = new InteractivePrompter<Cfg>(prompts);
      await p.promptServerConfig();

      const passedQuestions = inquirerPromptMock.mock.calls[0]?.[0] as Array<
        Record<string, unknown>
      >;
      expect(passedQuestions?.[0]?.['validate']).toBeInstanceOf(Function);
      expect(passedQuestions?.[0]?.['choices']).toEqual([{ name: 'Org 1', value: 'org-1' }]);
      expect(passedQuestions?.[0]?.['when']).toBeInstanceOf(Function);
    });

    it('default как функция вызывается с savedConfig', async () => {
      const defaultFn = vi.fn((saved?: Partial<Cfg>) => saved?.orgId ?? 'fallback');
      const prompts: ConfigPromptDefinition<Cfg>[] = [
        { name: 'orgId', type: 'input', message: 'Org:', default: defaultFn },
      ];
      inquirerPromptMock.mockResolvedValue({ orgId: 'x' });

      const p = new InteractivePrompter<Cfg>(prompts);
      await p.promptServerConfig({ orgId: 'saved-org' });

      const passedQuestions = inquirerPromptMock.mock.calls[0]?.[0] as Array<
        Record<string, unknown>
      >;
      const defaultGetter = passedQuestions?.[0]?.['default'] as () => unknown;
      const result = defaultGetter();
      expect(result).toBe('saved-org');
    });

    it('default как значение передаётся как есть', async () => {
      const prompts: ConfigPromptDefinition<Cfg>[] = [
        { name: 'port', type: 'number', message: 'Port:', default: 3000 },
      ];
      inquirerPromptMock.mockResolvedValue({ port: 3000 });

      const p = new InteractivePrompter<Cfg>(prompts);
      await p.promptServerConfig();

      const passedQuestions = inquirerPromptMock.mock.calls[0]?.[0] as Array<
        Record<string, unknown>
      >;
      expect(passedQuestions?.[0]?.['default']).toBe(3000);
    });

    it('mask явный значение перебивает дефолтное "*"', async () => {
      const prompts: ConfigPromptDefinition<Cfg>[] = [
        { name: 'token', type: 'password', message: 'Token:', mask: '#' },
      ];
      inquirerPromptMock.mockResolvedValue({ token: 'x' });

      const p = new InteractivePrompter<Cfg>(prompts);
      await p.promptServerConfig();

      const passedQuestions = inquirerPromptMock.mock.calls[0]?.[0] as Array<
        Record<string, unknown>
      >;
      expect(passedQuestions?.[0]?.['mask']).toBe('#');
    });
  });

  describe('promptClientSelection (static)', () => {
    it('возвращает выбранное имя клиента', async () => {
      const clients: MCPClientInfo[] = [
        {
          name: 'gemini',
          displayName: 'Gemini',
          description: 'g',
          configPath: '/x',
          platforms: ['darwin'],
        },
        {
          name: 'qwen',
          displayName: 'Qwen',
          description: 'q',
          configPath: '/y',
          platforms: ['darwin'],
        },
      ];
      inquirerPromptMock.mockResolvedValue({ selectedClient: 'qwen' });

      const result = await InteractivePrompter.promptClientSelection(clients);
      expect(result).toBe('qwen');
    });
  });

  describe('promptConfirmation (static)', () => {
    it('возвращает boolean ответ', async () => {
      inquirerPromptMock.mockResolvedValue({ confirmed: true });
      const result = await InteractivePrompter.promptConfirmation('OK?');
      expect(result).toBe(true);
    });

    it('передаёт default value', async () => {
      inquirerPromptMock.mockResolvedValue({ confirmed: false });
      await InteractivePrompter.promptConfirmation('OK?', false);
      const passed = inquirerPromptMock.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
      expect(passed?.[0]?.['default']).toBe(false);
    });
  });

  describe('promptSelection (static)', () => {
    it('возвращает выбранное значение', async () => {
      inquirerPromptMock.mockResolvedValue({ selected: 'b' });
      const result = await InteractivePrompter.promptSelection('Pick', [
        { name: 'A', value: 'a' as const },
        { name: 'B', value: 'b' as const },
      ]);
      expect(result).toBe('b');
    });
  });
});
