/**
 * Unit-тесты IssueDescriptionEditorResourceProvider (пакет 6.1 — пилот MCP
 * Apps №1). Стиль зеркалирует issue-resource-provider.test.ts.
 *
 * Покрывает DoD пилота:
 * - ресурс читается через resources/read (readResource) по фиксированному URI;
 * - CSP объявлен в `_meta.ui.csp`, внешние origin не разрешены (пустые списки);
 * - размер HTML-бандла зафиксирован порогом.
 */

import { describe, it, expect } from 'vitest';
import { IssueDescriptionEditorResourceProvider } from '#resources/issue-description-editor-resource-provider.js';
import { ISSUE_DESCRIPTION_EDITOR_URI } from '#resources/apps-ui-uri.js';
import { buildIssueDescriptionEditorHtml } from '#resources/issue-description-editor.widget.js';
import { UPDATE_ISSUE_TOOL_METADATA } from '#tools/api/issues/update/update-issue.metadata.js';

const TOOL_NAMES = { updateIssue: UPDATE_ISSUE_TOOL_METADATA.name };
const WIDGET_HTML = buildIssueDescriptionEditorHtml(TOOL_NAMES);

/** Генерозный, но конечный порог — ловит случайное раздутие бандла
 * (например, вставку библиотеки), а не текущий фактический размер (~17 КБ). */
const MAX_BUNDLE_SIZE_BYTES = 24 * 1024;

interface UiCspContent {
  uri: string;
  mimeType?: string;
  text: string;
  _meta?: {
    ui?: {
      csp?: {
        connectDomains: readonly string[];
        resourceDomains: readonly string[];
        frameDomains: readonly string[];
        baseUriDomains: readonly string[];
      };
    };
  };
}

describe('IssueDescriptionEditorResourceProvider', () => {
  it('id === "tracker-apps-issue-description-editor"', () => {
    const provider = new IssueDescriptionEditorResourceProvider(TOOL_NAMES);
    expect(provider.id).toBe('tracker-apps-issue-description-editor');
  });

  it('listResources() отдаёт единственный ресурс с mimeType text/html;profile=mcp-app', () => {
    const provider = new IssueDescriptionEditorResourceProvider(TOOL_NAMES);
    const page = provider.listResources();
    expect(page.resources).toHaveLength(1);
    expect(page.resources[0]?.uri).toBe(ISSUE_DESCRIPTION_EDITOR_URI);
    expect(page.resources[0]?.mimeType).toBe('text/html;profile=mcp-app');
    expect(page.nextCursor).toBeUndefined();
  });

  it('readResource() по фиксированному URI возвращает HTML-бандл', async () => {
    const provider = new IssueDescriptionEditorResourceProvider(TOOL_NAMES);
    const contents = (await provider.readResource(ISSUE_DESCRIPTION_EDITOR_URI)) as
      | UiCspContent[]
      | undefined;

    expect(contents).toHaveLength(1);
    const [content] = contents ?? [];
    expect(content?.uri).toBe(ISSUE_DESCRIPTION_EDITOR_URI);
    expect(content?.mimeType).toBe('text/html;profile=mcp-app');
    expect(content?.text).toBe(WIDGET_HTML);
  });

  it('readResource() возвращает undefined для чужого URI', async () => {
    const provider = new IssueDescriptionEditorResourceProvider(TOOL_NAMES);
    const contents = await provider.readResource('ui://tracker/does-not-exist');
    expect(contents).toBeUndefined();
  });

  it('readResource() возвращает undefined для URI другой схемы (tracker://)', async () => {
    const provider = new IssueDescriptionEditorResourceProvider(TOOL_NAMES);
    const contents = await provider.readResource('tracker://issue/QUEUE-1');
    expect(contents).toBeUndefined();
  });

  it('DoD: _meta.ui.csp объявлен и не разрешает НИ ОДНОГО внешнего origin', async () => {
    const provider = new IssueDescriptionEditorResourceProvider(TOOL_NAMES);
    const contents = (await provider.readResource(ISSUE_DESCRIPTION_EDITOR_URI)) as
      | UiCspContent[]
      | undefined;
    const csp = contents?.[0]?._meta?.ui?.csp;

    expect(csp).toBeDefined();
    expect(csp?.connectDomains).toEqual([]);
    expect(csp?.resourceDomains).toEqual([]);
    expect(csp?.frameDomains).toEqual([]);
    expect(csp?.baseUriDomains).toEqual([]);
  });

  it('listTemplates() пуст — URI фиксированный, без переменной части', async () => {
    const provider = new IssueDescriptionEditorResourceProvider(TOOL_NAMES);
    const templates = await provider.listTemplates();
    expect(templates).toEqual([]);
  });

  it('DoD: размер HTML-бандла ресурса зафиксирован порогом', () => {
    const sizeBytes = Buffer.byteLength(WIDGET_HTML, 'utf8');
    expect(sizeBytes).toBeGreaterThan(0);
    expect(sizeBytes).toBeLessThanOrEqual(MAX_BUNDLE_SIZE_BYTES);
  });

  it('бандл не подключает ни одного внешнего origin (нет http(s):// вне комментариев)', () => {
    // Комментарии допускают ссылки на спеку (SEP-1865) — эти строки не идут
    // в браузер как исполняемый/загружаемый ресурс. Проверяем именно то, что
    // могло бы стать сетевым запросом: src=/href= на http(s), <link>, fetch к
    // внешнему хосту.
    expect(WIDGET_HTML).not.toMatch(/<link[^>]+href=["']https?:/i);
    expect(WIDGET_HTML).not.toMatch(/<script[^>]+src=["']https?:/i);
    expect(WIDGET_HTML).not.toMatch(/@import/i);
  });
});
