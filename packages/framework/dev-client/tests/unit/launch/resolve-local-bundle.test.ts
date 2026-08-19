/**
 * Тесты резолва локального бандла: бандл отсутствует; бандл устарел; бандл свежий (DoD 4);
 * свежесть считается и по исходникам вбандленных workspace-зависимостей (`@fractalizer/*`),
 * и по `package.json`/`tsup.config.ts` пакета сервера; вход `bin` выбирается по признаку
 * бандла, а не по порядку ключей.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { resolveLocalBundle } from '../../../src/launch/resolve-local-bundle.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-dev-client-bundle-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const LONG_AGO = new Date(Date.now() - 3_600_000);

/**
 * Пишет `package.json` и **состаривает** его: сам манифест теперь входит в базу
 * сверки свежести (его правка меняет содержимое бандла), поэтому только что
 * записанный файл иначе делал бы устаревшим любой бандл фикстуры.
 */
async function writePackageJson(
  bin: string | Record<string, string>,
  dir: string = tmpDir,
  dependencies: Record<string, string> = {}
): Promise<void> {
  const file = path.join(dir, 'package.json');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify({ name: 'fixture', bin, dependencies }), 'utf-8');
  await fs.utimes(file, LONG_AGO, LONG_AGO);
}

async function touch(filePath: string, mtime: Date): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, 'x');
  await fs.utimes(filePath, mtime, mtime);
}

async function writeManifest(dir: string, manifest: Record<string, unknown>): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'package.json');
  await fs.writeFile(file, JSON.stringify(manifest), 'utf-8');
  await fs.utimes(file, LONG_AGO, LONG_AGO);
}

describe('resolveLocalBundle — база сверки не должна молча выключаться (N3)', () => {
  /** Сервер + вбандленная зависимость, разложенные как npm workspaces (симлинк в node_modules). */
  async function buildTree(): Promise<{ serverDir: string; depDir: string }> {
    const serverDir = tmpDir;
    const depDir = path.join(tmpDir, 'workspace-dep');
    await writeManifest(depDir, { name: '@fractalizer/mcp-core', bin: 'dist/dep.js' });
    await touch(path.join(depDir, 'src/b.ts'), LONG_AGO);
    await writeManifest(serverDir, {
      name: 'fixture-server',
      bin: 'dist/server.bundle.cjs',
      dependencies: { '@fractalizer/mcp-core': '^1.0.0' },
    });
    await touch(path.join(serverDir, 'src/index.ts'), LONG_AGO);
    await touch(path.join(serverDir, 'dist/server.bundle.cjs'), new Date(Date.now() - 60_000));
    await fs.mkdir(path.join(serverDir, 'node_modules/@fractalizer'), { recursive: true });
    await fs.symlink(depDir, path.join(serverDir, 'node_modules/@fractalizer/mcp-core'), 'dir');
    return { serverDir, depDir };
  }

  it('baseline: зависимость резолвится и её свежая правка даёт stale', async () => {
    const { serverDir, depDir } = await buildTree();
    await touch(path.join(depDir, 'src/b.ts'), new Date());
    expect((await resolveLocalBundle(serverDir)).outcome).toBe('stale');
  });

  it('node_modules снесён и каталог зависимости не найден → unverifiable, а НЕ ok', async () => {
    // Регресс на N3: `resolveWorkspaceDir` возвращал undefined, зависимость
    // молча пропускалась, и «резолв не удался» становилось неотличимо от
    // «зависимость проверена и чиста» — при том же файле из будущего.
    const { serverDir, depDir } = await buildTree();
    await touch(path.join(depDir, 'src/b.ts'), new Date());
    await fs.rm(path.join(serverDir, 'node_modules'), { recursive: true, force: true });
    await fs.rm(depDir, { recursive: true, force: true });

    const result = await resolveLocalBundle(serverDir);
    expect(result.outcome).toBe('unverifiable');
    if (result.outcome !== 'unverifiable') throw new Error('unreachable');
    expect(result.unresolved).toEqual(['@fractalizer/mcp-core']);
    expect(result.hint).toContain('@fractalizer/mcp-core');
  });

  it('без node_modules каталог зависимости берётся из workspaces корневого манифеста', async () => {
    // Резолв не должен опираться на факт установки: состав монорепо описан
    // корневым `workspaces`, и правка зависимости обязана давать stale даже
    // при отсутствующем node_modules.
    const root = tmpDir;
    const serverDir = path.join(root, 'packages/server');
    const depDir = path.join(root, 'packages/core');
    await writeManifest(root, { name: 'root', workspaces: ['packages/*'] });
    await writeManifest(depDir, { name: '@fractalizer/mcp-core' });
    await writeManifest(serverDir, {
      name: 'fixture-server',
      bin: 'dist/server.bundle.cjs',
      dependencies: { '@fractalizer/mcp-core': '^1.0.0' },
    });
    await touch(path.join(serverDir, 'src/index.ts'), LONG_AGO);
    await touch(path.join(serverDir, 'dist/server.bundle.cjs'), new Date(Date.now() - 60_000));
    await touch(path.join(depDir, 'src/core.ts'), new Date());

    expect((await resolveLocalBundle(serverDir)).outcome).toBe('stale');
  });
});

describe('resolveLocalBundle — правка общего конфига сборки (N5)', () => {
  it('outcome: stale — свежее правка ../tsup.config.base.ts', async () => {
    // `<pkg>/tsup.config.ts` — тонкая обёртка; `noExternal`/`target`/`format`
    // живут в общем базовом конфиге, и его правка меняет содержимое бандла.
    const serverDir = path.join(tmpDir, 'servers/fixture');
    await writeManifest(serverDir, { name: 'fixture', bin: 'dist/server.bundle.cjs' });
    await touch(path.join(serverDir, 'src/index.ts'), LONG_AGO);
    await touch(path.join(serverDir, 'dist/server.bundle.cjs'), new Date(Date.now() - 60_000));
    await touch(path.join(tmpDir, 'servers/tsup.config.base.ts'), new Date());

    expect((await resolveLocalBundle(serverDir)).outcome).toBe('stale');
  });
});

describe('resolveLocalBundle', () => {
  it('outcome: missing — бандл не собран', async () => {
    await writePackageJson('dist/server.bundle.cjs');
    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('missing');
    if (result.outcome !== 'missing') throw new Error('unreachable');
    expect(result.hint).toContain('npm run build');
  });

  it('outcome: stale — src новее бандла', async () => {
    await writePackageJson('dist/server.bundle.cjs');
    const older = new Date(Date.now() - 60_000);
    const newer = new Date();
    await touch(path.join(tmpDir, 'dist/server.bundle.cjs'), older);
    await touch(path.join(tmpDir, 'src/index.ts'), newer);

    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('stale');
    if (result.outcome !== 'stale') throw new Error('unreachable');
    expect(result.hint).toContain('npm run build');
    expect(result.newestSourceMtimeMs).toBeGreaterThan(result.bundleMtimeMs);
  });

  it('outcome: ok — бандл новее src', async () => {
    await writePackageJson('dist/server.bundle.cjs');
    const older = new Date(Date.now() - 60_000);
    const newer = new Date();
    await touch(path.join(tmpDir, 'src/index.ts'), older);
    await touch(path.join(tmpDir, 'dist/server.bundle.cjs'), newer);

    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') throw new Error('unreachable');
    expect(result.path).toBe(path.join(tmpDir, 'dist/server.bundle.cjs'));
  });

  it('outcome: ok — при отсутствии каталога src (нечего сравнивать, свежесть не блокирует)', async () => {
    await writePackageJson('dist/server.bundle.cjs');
    await touch(path.join(tmpDir, 'dist/server.bundle.cjs'), new Date());
    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('ok');
  });

  it('вложенные файлы src/** учитываются рекурсивно', async () => {
    await writePackageJson('dist/server.bundle.cjs');
    const older = new Date(Date.now() - 60_000);
    const newer = new Date();
    await touch(path.join(tmpDir, 'dist/server.bundle.cjs'), older);
    await touch(path.join(tmpDir, 'src/deep/nested/file.ts'), newer);

    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('stale');
  });

  it('outcome: invalidPackageJson — нет поля "bin"', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'fixture' }));
    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('invalidPackageJson');
    if (result.outcome !== 'invalidPackageJson') throw new Error('unreachable');
    expect(result.reason).toContain('bin');
  });

  it('outcome: invalidPackageJson — package.json отсутствует', async () => {
    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('invalidPackageJson');
  });

  it('outcome: invalidPackageJson — package.json битый JSON', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), '{not valid json');
    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('invalidPackageJson');
  });

  it('из объектной формы "bin" берёт вход-бандл, а не первый по порядку ключей', async () => {
    // Регресс на L4/D3: connect-CLI записан ПЕРВЫМ ключом — резолв, зависящий
    // от порядка ключей, запустил бы его вместо MCP-сервера.
    await writePackageJson({
      'mcp-tracker-connect': 'dist/cli/bin/mcp-connect.js',
      'mcp-server-fixture': 'dist/server.bundle.cjs',
    });
    await touch(path.join(tmpDir, 'dist/cli/bin/mcp-connect.js'), new Date());
    await touch(path.join(tmpDir, 'dist/server.bundle.cjs'), new Date());
    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('ok');
    if (result.outcome !== 'ok') throw new Error('unreachable');
    expect(result.path).toBe(path.join(tmpDir, 'dist/server.bundle.cjs'));
  });

  it('outcome: invalidPackageJson — в "bin" нет входа-бандла', async () => {
    await writePackageJson({ 'mcp-tracker-connect': 'dist/cli/bin/mcp-connect.js' });
    await touch(path.join(tmpDir, 'dist/cli/bin/mcp-connect.js'), new Date());
    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('invalidPackageJson');
  });

  it('outcome: stale — свежее правка package.json пакета сервера', async () => {
    await writePackageJson('dist/server.bundle.cjs');
    await touch(path.join(tmpDir, 'src/index.ts'), LONG_AGO);
    await touch(path.join(tmpDir, 'dist/server.bundle.cjs'), new Date(Date.now() - 60_000));
    const now = new Date();
    await fs.utimes(path.join(tmpDir, 'package.json'), now, now);

    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('stale');
  });

  it('outcome: stale — свежее правка tsup.config.ts пакета сервера', async () => {
    await writePackageJson('dist/server.bundle.cjs');
    await touch(path.join(tmpDir, 'src/index.ts'), LONG_AGO);
    await touch(path.join(tmpDir, 'dist/server.bundle.cjs'), new Date(Date.now() - 60_000));
    await touch(path.join(tmpDir, 'tsup.config.ts'), new Date());

    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('stale');
  });

  it('outcome: stale — свежее правка исходников вбандленной workspace-зависимости', async () => {
    // Регресс на H2: `noExternal: [/.*/]` в конфиге сборки серверов вбандливает
    // `@fractalizer/mcp-core` целиком, а сверка смотрела только на `src`
    // сервера — правка core не делала бандл устаревшим, и сессия молча
    // открывалась на старом коде.
    const depDir = path.join(tmpDir, 'workspace-dep');
    await writePackageJson('dist/dep.js', depDir);
    await touch(path.join(depDir, 'src/core.ts'), new Date());

    await writePackageJson('dist/server.bundle.cjs', tmpDir, { '@fractalizer/mcp-core': '^1.0.0' });
    await touch(path.join(tmpDir, 'src/index.ts'), LONG_AGO);
    await touch(path.join(tmpDir, 'dist/server.bundle.cjs'), new Date(Date.now() - 60_000));
    // Имитация раскладки npm workspaces: симлинк в node_modules на пакет монорепо.
    await fs.mkdir(path.join(tmpDir, 'node_modules/@fractalizer'), { recursive: true });
    await fs.symlink(depDir, path.join(tmpDir, 'node_modules/@fractalizer/mcp-core'), 'dir');

    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('stale');
    if (result.outcome !== 'stale') throw new Error('unreachable');
    expect(result.newestSourcePath).toContain('core.ts');
  });

  it('вбандленные зависимости обходятся транзитивно (dep → dep-of-dep)', async () => {
    const depDir = path.join(tmpDir, 'workspace-dep');
    const deepDir = path.join(tmpDir, 'workspace-deep');
    await writePackageJson('dist/deep.js', deepDir);
    await touch(path.join(deepDir, 'src/infra.ts'), new Date());

    await writePackageJson('dist/dep.js', depDir, { '@fractalizer/mcp-infrastructure': '^1.0.0' });
    await touch(path.join(depDir, 'src/core.ts'), LONG_AGO);

    await writePackageJson('dist/server.bundle.cjs', tmpDir, { '@fractalizer/mcp-core': '^1.0.0' });
    await touch(path.join(tmpDir, 'src/index.ts'), LONG_AGO);
    await touch(path.join(tmpDir, 'dist/server.bundle.cjs'), new Date(Date.now() - 60_000));

    await fs.mkdir(path.join(tmpDir, 'node_modules/@fractalizer'), { recursive: true });
    await fs.symlink(depDir, path.join(tmpDir, 'node_modules/@fractalizer/mcp-core'), 'dir');
    await fs.symlink(
      deepDir,
      path.join(tmpDir, 'node_modules/@fractalizer/mcp-infrastructure'),
      'dir'
    );

    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('stale');
    if (result.outcome !== 'stale') throw new Error('unreachable');
    expect(result.newestSourcePath).toContain('infra.ts');
  });

  it('не-workspace зависимости (npm-пакеты) в базу сверки не входят', async () => {
    await writePackageJson('dist/server.bundle.cjs', tmpDir, { axios: '^1.0.0' });
    await touch(path.join(tmpDir, 'src/index.ts'), LONG_AGO);
    await touch(path.join(tmpDir, 'dist/server.bundle.cjs'), new Date());
    const result = await resolveLocalBundle(tmpDir);
    expect(result.outcome).toBe('ok');
  });
});
