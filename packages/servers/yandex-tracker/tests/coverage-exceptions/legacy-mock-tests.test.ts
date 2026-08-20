/**
 * Самотест барьеров `validateLegacyMockTestList` (F4, найдено ревью оркестратора):
 * храповик перечня держался на комментарии — без этого файла роняющий код никем не
 * проверялся. Каждый кейс пишет во ВРЕМЕННЫЙ каталог (см. L-3,
 * `coverage-exceptions/index.test.ts`), не боевой `tests/integration/`.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateLegacyMockTestList } from './legacy-mock-tests.js';

describe('validateLegacyMockTestList', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir !== undefined) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  function makeTempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDir = dir;
    return dir;
  }

  function writeRealTest(dir: string, relativePath: string): void {
    const absolutePath = join(dir, relativePath);
    mkdirSync(join(absolutePath, '..'), { recursive: true });
    writeFileSync(
      absolutePath,
      "import { describe, it, expect } from 'vitest';\n" +
        "describe('legacy', () => {\n" +
        "  it('does something', () => {\n" +
        '    expect(1).toBe(1);\n' +
        '  });\n' +
        '});\n'
    );
  }

  it('перечень и файлы в согласии — проходит без ошибок', () => {
    const dir = makeTempDir('legacy-mock-tests-ok-');
    writeRealTest(dir, 'a.tool.integration.test.ts');
    writeRealTest(dir, 'b.tool.integration.test.ts');

    expect(() =>
      validateLegacyMockTestList({
        paths: new Set(['a.tool.integration.test.ts', 'b.tool.integration.test.ts']),
        baselineCount: 2,
        packageRoot: dir,
      })
    ).not.toThrow();
  });

  it('размер перечня разошёлся с базлайном — роняет (F4, барьер 1: дописанная/убранная строка без правки числа)', () => {
    const dir = makeTempDir('legacy-mock-tests-baseline-');
    writeRealTest(dir, 'a.tool.integration.test.ts');

    expect(() =>
      validateLegacyMockTestList({
        paths: new Set(['a.tool.integration.test.ts']),
        baselineCount: 2,
        packageRoot: dir,
      })
    ).toThrow(/не совпадает с LEGACY_MOCK_TEST_BASELINE_COUNT/);
  });

  it('файла из перечня больше нет на диске — роняет с понятной причиной', () => {
    const dir = makeTempDir('legacy-mock-tests-missing-');

    expect(() =>
      validateLegacyMockTestList({
        paths: new Set(['missing.tool.integration.test.ts']),
        baselineCount: 1,
        packageRoot: dir,
      })
    ).toThrow(/перечень устарел, удали строку/);
  });

  it('файл выпотрошен до заглушки — роняет (F4, барьер 2: воспроизведение обхода C-2 на существующей строке)', () => {
    const dir = makeTempDir('legacy-mock-tests-gutted-');
    writeFileSync(join(dir, 'gutted.tool.integration.test.ts'), '// TODO: напишу потом\n');

    expect(() =>
      validateLegacyMockTestList({
        paths: new Set(['gutted.tool.integration.test.ts']),
        baselineCount: 1,
        packageRoot: dir,
      })
    ).toThrow(/не похож на реальный тест/);
  });
});
