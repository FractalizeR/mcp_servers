/**
 * Тесты чтения аргументов `call`: инлайновый JSON, `@файл`, ошибки разбора
 * (не JSON, не объект, файл не существует) — отделены от ошибок валидации
 * схемы на сервере (та проявляется уже в результате `tools/call`).
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { readToolArgs } from '../../src/cli/read-tool-args.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-dev-cli-args-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('readToolArgs', () => {
  it('инлайновый JSON-объект — ok', async () => {
    const result = await readToolArgs('{"issueId":"PROJ-1"}');
    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') throw new Error('unreachable');
    expect(result.args).toEqual({ issueId: 'PROJ-1' });
  });

  it('@файл — читает и разбирает содержимое', async () => {
    const filePath = path.join(tmpDir, 'args.json');
    await fs.writeFile(filePath, '{"a":1,"b":"x"}', 'utf-8');
    const result = await readToolArgs(`@${filePath}`);
    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') throw new Error('unreachable');
    expect(result.args).toEqual({ a: 1, b: 'x' });
  });

  it('@файл не существует — ошибка с путём в сообщении', async () => {
    const result = await readToolArgs(`@${path.join(tmpDir, 'missing.json')}`);
    expect(result.outcome).toBe('error');
    if (result.outcome !== 'error') throw new Error('unreachable');
    expect(result.message).toContain('missing.json');
  });

  it('невалидный JSON — ошибка разбора', async () => {
    const result = await readToolArgs('{not valid json');
    expect(result.outcome).toBe('error');
    if (result.outcome !== 'error') throw new Error('unreachable');
    expect(result.message).toContain('JSON');
  });

  it('JSON-массив — ошибка (аргументы должны быть объектом)', async () => {
    const result = await readToolArgs('[1,2,3]');
    expect(result.outcome).toBe('error');
    if (result.outcome !== 'error') throw new Error('unreachable');
    expect(result.message).toContain('объектом');
  });

  it('JSON-примитив (число) — ошибка', async () => {
    const result = await readToolArgs('42');
    expect(result.outcome).toBe('error');
  });
});
