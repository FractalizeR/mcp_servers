/**
 * DoD 4 пакета 3.1.C.tracker: `redactionAllowlist` заполнен осмысленно —
 * параметр с пользовательским текстом (тело комментария) в allow-list НЕ
 * попал, а безопасный идентификатор (issueId) виден в логе как значение.
 *
 * Использует реальный `redactParams` (пакет 3.1.F, @fractalizer/mcp-core) с
 * реальным `AddCommentTool.METADATA.redactionAllowlist` — то же сочетание,
 * что применяет `ToolRegistry.execute()` перед логированием.
 */

import { describe, it, expect } from 'vitest';
import { redactParams } from '@fractalizer/mcp-core';
import { ADD_COMMENT_TOOL_METADATA } from '#tools/api/comments/add/add-comment.metadata.js';
import { UPDATE_ISSUE_TOOL_METADATA } from '#tools/api/issues/update/update-issue.metadata.js';

describe('DoD 4: redactionAllowlist не раскрывает пользовательский текст', () => {
  it('add_comment: issueId раскрывается, text (тело комментария) — только маркер длины', () => {
    const params = {
      comments: [
        {
          issueId: 'QUEUE-123',
          text: 'секретный текст комментария, который нельзя логировать',
          attachmentIds: ['att-1'],
        },
      ],
      fields: ['id', 'text'],
    };

    const redacted = redactParams(params, {
      allowedKeys: ADD_COMMENT_TOOL_METADATA.redactionAllowlist ?? [],
    });

    // 'text' не в allow-list -> редактор ДОЛЖЕН заменить его на маркер формы,
    // а не раскрыть исходную строку.
    expect(ADD_COMMENT_TOOL_METADATA.redactionAllowlist).not.toContain('text');

    const comments = redacted['comments'] as {
      type: string;
      items: Array<{ type: string; properties: Record<string, unknown> }>;
    };
    const firstComment = comments.items[0];
    expect(firstComment).toBeDefined();

    // issueId (allow-listed) виден как значение
    expect(firstComment?.properties['issueId']).toBe('QUEUE-123');

    // text (НЕ allow-listed) — маркер формы, исходная строка НЕ попала в лог
    expect(firstComment?.properties['text']).toEqual({
      type: 'string',
      length: params.comments[0]!.text.length,
    });
    expect(JSON.stringify(firstComment?.properties['text'])).not.toContain('секретный');
  });

  it('update_issue: issueKey раскрывается, description (произвольный текст) — не в allow-list', () => {
    expect(UPDATE_ISSUE_TOOL_METADATA.redactionAllowlist).not.toContain('description');
    expect(UPDATE_ISSUE_TOOL_METADATA.redactionAllowlist).toContain('issueKey');

    const params = {
      issueKey: 'QUEUE-1',
      description: 'произвольное описание, которое нельзя раскрывать в логах',
      fields: ['key'],
    };

    const redacted = redactParams(params, {
      allowedKeys: UPDATE_ISSUE_TOOL_METADATA.redactionAllowlist ?? [],
    });

    expect(redacted['issueKey']).toBe('QUEUE-1');
    expect(redacted['description']).toEqual({
      type: 'string',
      length: params.description.length,
    });
  });
});
