/**
 * Unit tests for TickTickPromptProvider (пакет 5.1.C.ticktick, промпты)
 */

import { describe, it, expect } from 'vitest';
import { ProtocolError } from '@modelcontextprotocol/server';
import {
  TickTickPromptProvider,
  TICKTICK_PROMPT_NAMES,
} from '#prompts/ticktick-prompt.provider.js';

describe('TickTickPromptProvider', () => {
  it('имеет стабильный id провайдера', () => {
    const provider = new TickTickPromptProvider();
    expect(provider.id).toBe('ticktick-prompts');
  });

  it('listPrompts возвращает все три промпта с описаниями и аргументами', () => {
    const provider = new TickTickPromptProvider();

    const prompts = provider.listPrompts();

    expect(prompts).toHaveLength(3);
    const names = prompts.map((p) => p.name);
    expect(names).toEqual([
      TICKTICK_PROMPT_NAMES.dailyReview,
      TICKTICK_PROMPT_NAMES.weeklyReview,
      TICKTICK_PROMPT_NAMES.gtdInboxReview,
    ]);
    for (const prompt of prompts) {
      expect(prompt.description).toBeTruthy();
    }
  });

  it('daily_review: содержит аргумент date, НЕ обязательный', () => {
    const provider = new TickTickPromptProvider();
    const prompt = provider.listPrompts().find((p) => p.name === TICKTICK_PROMPT_NAMES.dailyReview);

    expect(prompt?.arguments).toEqual([expect.objectContaining({ name: 'date', required: false })]);
  });

  it('gtd_inbox_review: содержит аргумент project_id, ОБЯЗАТЕЛЬНЫЙ', () => {
    const provider = new TickTickPromptProvider();
    const prompt = provider
      .listPrompts()
      .find((p) => p.name === TICKTICK_PROMPT_NAMES.gtdInboxReview);

    expect(prompt?.arguments).toEqual([
      expect.objectContaining({ name: 'project_id', required: true }),
    ]);
  });

  it('listPrompts: два последовательных вызова дают побайтово идентичный результат', () => {
    const provider = new TickTickPromptProvider();

    const first = JSON.stringify(provider.listPrompts());
    const second = JSON.stringify(provider.listPrompts());

    expect(second).toBe(first);
  });

  it('getPrompt(daily_review) без аргумента date подставляет сегодняшнюю дату', () => {
    const provider = new TickTickPromptProvider();

    const result = provider.getPrompt(TICKTICK_PROMPT_NAMES.dailyReview);

    expect(result).toBeDefined();
    const text = (result?.messages[0]?.content as { text: string }).text;
    const todayIso = new Date().toISOString().slice(0, 10);
    expect(text).toContain(todayIso);
    expect(text).toContain('get_overdue_tasks');
    expect(text).toContain('get_tasks_due_today');
  });

  it('getPrompt(daily_review) с аргументом date подставляет переданное значение', () => {
    const provider = new TickTickPromptProvider();

    const result = provider.getPrompt(TICKTICK_PROMPT_NAMES.dailyReview, { date: '2026-03-15' });

    const text = (result?.messages[0]?.content as { text: string }).text;
    expect(text).toContain('2026-03-15');
  });

  it('getPrompt(weekly_review) не требует аргументов и упоминает нужные инструменты', () => {
    const provider = new TickTickPromptProvider();

    const result = provider.getPrompt(TICKTICK_PROMPT_NAMES.weeklyReview);

    expect(result).toBeDefined();
    const text = (result?.messages[0]?.content as { text: string }).text;
    expect(text).toContain('get_tasks_due_this_week');
    expect(text).toContain('get_overdue_tasks');
    expect(text).toContain('get_projects');
  });

  it('getPrompt(gtd_inbox_review) с project_id подставляет его в текст', () => {
    const provider = new TickTickPromptProvider();

    const result = provider.getPrompt(TICKTICK_PROMPT_NAMES.gtdInboxReview, {
      project_id: 'inbox123',
    });

    expect(result).toBeDefined();
    const text = (result?.messages[0]?.content as { text: string }).text;
    expect(text).toContain('inbox123');
    expect(text).toContain('get_project_tasks');
  });

  it('getPrompt(gtd_inbox_review) БЕЗ обязательного project_id бросает внятную ProtocolError(-32602)', () => {
    const provider = new TickTickPromptProvider();

    expect(() => provider.getPrompt(TICKTICK_PROMPT_NAMES.gtdInboxReview)).toThrow(ProtocolError);
    try {
      provider.getPrompt(TICKTICK_PROMPT_NAMES.gtdInboxReview);
      expect.fail('ожидалось исключение');
    } catch (error) {
      expect(error).toBeInstanceOf(ProtocolError);
      expect((error as ProtocolError).code).toBe(-32602);
      expect((error as ProtocolError).message).toContain('project_id');
    }
  });

  it('getPrompt(gtd_inbox_review) с пустой строкой project_id тоже бросает ошибку', () => {
    const provider = new TickTickPromptProvider();

    expect(() =>
      provider.getPrompt(TICKTICK_PROMPT_NAMES.gtdInboxReview, { project_id: '   ' })
    ).toThrow(ProtocolError);
  });

  it('getPrompt: неизвестное имя промпта → undefined (не ошибка на уровне провайдера)', () => {
    const provider = new TickTickPromptProvider();

    const result = provider.getPrompt('does-not-exist');

    expect(result).toBeUndefined();
  });
});
