/**
 * Тесты классификации инструментов: read / write / local-side-effect.
 */

import { describe, it, expect } from 'vitest';
import {
  classify,
  hasPathLikeProperty,
  type ToolSummary,
} from '../../../src/write-policy/classify.js';

function makeTool(overrides: Partial<ToolSummary> = {}): ToolSummary {
  return {
    name: 'some_tool',
    readOnly: false,
    destructive: false,
    hasPathArgs: false,
    ...overrides,
  };
}

describe('classify', () => {
  it('read: readOnly === true и нет пути в схеме', () => {
    expect(classify(makeTool({ readOnly: true, hasPathArgs: false }))).toBe('read');
  });

  it('local-side-effect: readOnly === true, но есть путь в схеме (download_attachment-подобный)', () => {
    expect(classify(makeTool({ readOnly: true, hasPathArgs: true }))).toBe('local-side-effect');
  });

  it('write: readOnly === false', () => {
    expect(classify(makeTool({ readOnly: false, hasPathArgs: false }))).toBe('write');
  });

  it('write: readOnly отсутствует (readOnlyHint !== true трактуется как запись) — консервативный дефолт', () => {
    // ToolSummary.readOnly уже нормализован к boolean на стороне session/dev-session.ts
    // (readOnlyHint === true); здесь проверяем именно это значение false.
    expect(classify(makeTool({ readOnly: false, hasPathArgs: true }))).toBe('write');
  });

  it('write: противоречивая разметка readOnlyHint + destructiveHint решается в пользу записи (D9)', () => {
    expect(classify(makeTool({ readOnly: true, destructive: true }))).toBe('write');
  });
});

describe('hasPathLikeProperty', () => {
  it('true для схемы с полем saveToPath (эмпирическая конвенция трёх серверов)', () => {
    expect(
      hasPathLikeProperty({
        type: 'object',
        properties: { saveToPath: { type: 'string' } },
      })
    ).toBe(true);
  });

  it('true для прочих имён с квалификатором локальной записи', () => {
    expect(hasPathLikeProperty({ properties: { OutputPath: {} } })).toBe(true);
    expect(hasPathLikeProperty({ properties: { FILE_PATH: {} } })).toBe(true);
    expect(hasPathLikeProperty({ properties: { save_to_path: {} } })).toBe(true);
    expect(hasPathLikeProperty({ properties: { destPath: {} } })).toBe(true);
  });

  it('false для голого "path" — это путь API у raw_api_request, а не путь на диске (H3)', () => {
    // Регресс: раньше эвристика ловила любое имя, содержащее "path", и запирала
    // read-only escape hatch (`z.literal("GET")`) за --dangerously-allow-write.
    expect(
      hasPathLikeProperty({
        type: 'object',
        properties: { method: {}, path: {}, query: {} },
      })
    ).toBe(false);
    expect(hasPathLikeProperty({ properties: { urlPath: {} } })).toBe(false);
    expect(hasPathLikeProperty({ properties: { pathPrefix: {} } })).toBe(false);
  });

  it('raw_api_request классифицируется как read, инструмент с saveToPath — как local-side-effect', () => {
    const rawApi = makeTool({
      name: 'raw_api_request',
      readOnly: true,
      hasPathArgs: hasPathLikeProperty({ properties: { method: {}, path: {}, query: {} } }),
    });
    const downloader = makeTool({
      name: 'download_attachment',
      readOnly: true,
      hasPathArgs: hasPathLikeProperty({ properties: { id: {}, saveToPath: {} } }),
    });
    expect(classify(rawApi)).toBe('read');
    expect(classify(downloader)).toBe('local-side-effect');
  });

  it('false когда свойств с "path" в имени нет', () => {
    expect(
      hasPathLikeProperty({
        type: 'object',
        properties: { issueId: { type: 'string' }, filename: { type: 'string' } },
      })
    ).toBe(false);
  });

  it('false для отсутствующей/некорректной схемы', () => {
    expect(hasPathLikeProperty(undefined)).toBe(false);
    expect(hasPathLikeProperty(null)).toBe(false);
    expect(hasPathLikeProperty('not an object')).toBe(false);
    expect(hasPathLikeProperty({ type: 'object' })).toBe(false);
    expect(hasPathLikeProperty({ properties: null })).toBe(false);
  });
});
