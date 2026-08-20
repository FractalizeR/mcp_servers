/**
 * `loadCoverageExceptions` подхватывает `{категория}.ts` файлы каталога, переданного
 * параметром, автообходом — план §C: `index.ts` не правится пакетами 2.1.2,
 * добавляющими свою категорию. Каждый кейс пишет во ВРЕМЕННЫЙ каталог вне git (L-3,
 * найдено ревью пакета): запись в отслеживаемый `tests/coverage-exceptions/` под
 * `vitest watch` перезапускала бы прогон, а параллельный `coverage:matrix` подхватил
 * бы вымышленный инструмент.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCoverageExceptions } from './index.js';

describe('loadCoverageExceptions', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir !== undefined) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  function writeCategory(source: string): string {
    tempDir = mkdtempSync(join(tmpdir(), 'coverage-exceptions-test-'));
    writeFileSync(join(tempDir, 'temp-category.ts'), source);
    return tempDir;
  }

  it('пустой каталог без файлов категорий даёт пустой список, а не дамп реестра', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'coverage-exceptions-test-'));

    const exceptions = await loadCoverageExceptions(tempDir);

    expect(exceptions).toEqual([]);
  });

  it('подхватывает новый файл категории автообходом, без правки index.ts', async () => {
    const dir = writeCategory(
      'export const EXCEPTIONS = [\n' +
        "  { tool: 'get_projects', property: 'С-5', reason: 'тест оснастки', replacedBy: null },\n" +
        '];\n'
    );

    const exceptions = await loadCoverageExceptions(dir);

    expect(exceptions).toContainEqual({
      tool: 'get_projects',
      property: 'С-5',
      reason: 'тест оснастки',
      replacedBy: null,
    });
  });

  it('файл категории без EXCEPTIONS роняет с понятной причиной', async () => {
    const dir = writeCategory('export const NOT_EXCEPTIONS = [];\n');

    await expect(loadCoverageExceptions(dir)).rejects.toThrow(/не экспортирует EXCEPTIONS/);
  });

  it('EXCEPTIONS не массив роняет с понятной причиной', async () => {
    const dir = writeCategory("export const EXCEPTIONS = { tool: 'get_projects' };\n");

    await expect(loadCoverageExceptions(dir)).rejects.toThrow(/не массив/);
  });

  it('пустой reason роняет загрузку', async () => {
    const dir = writeCategory(
      "export const EXCEPTIONS = [{ tool: 'get_projects', property: 'С-5', reason: '   ', replacedBy: null }];\n"
    );

    await expect(loadCoverageExceptions(dir)).rejects.toThrow(/reason не может быть пустым/);
  });

  it('несуществующий инструмент роняет загрузку', async () => {
    const dir = writeCategory(
      "export const EXCEPTIONS = [{ tool: '__nonexistent_tool__', property: 'С-5', reason: 'x', replacedBy: null }];\n"
    );

    await expect(loadCoverageExceptions(dir)).rejects.toThrow(/несуществующий инструмент/);
  });

  it('свойство вне CoverageProperty роняет загрузку', async () => {
    const dir = writeCategory(
      "export const EXCEPTIONS = [{ tool: 'get_projects', property: 'С-99', reason: 'x', replacedBy: null }];\n"
    );

    await expect(loadCoverageExceptions(dir)).rejects.toThrow(/неизвестное свойство/);
  });
});
