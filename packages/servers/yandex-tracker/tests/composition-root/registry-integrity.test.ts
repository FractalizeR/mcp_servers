/**
 * Реестры классов для DI собираются из десятков `#`-импортов. Промах резолвера
 * (`vite-tsconfig-paths` подменял `#tools/*` на `dist/index.js#tools/*`) или
 * цикл ESM-модулей отдают массив с `undefined`-элементами — и это видно только
 * в рантайме: ни `tsc`, ни `depcruise` такой отказ не ловят.
 */

import { describe, it, expect } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import { OPERATION_CLASSES } from '#composition-root/definitions/operation-definitions.js';

const registries = [
  ['TOOL_CLASSES', TOOL_CLASSES as ReadonlyArray<unknown>],
  ['OPERATION_CLASSES', OPERATION_CLASSES as ReadonlyArray<unknown>],
] as const;

describe.each(registries)('%s', (registryName, classes) => {
  it('не содержит элементов, не доехавших через резолвер или цикл импортов', () => {
    const broken = classes
      .map((entry, index) => ({ index, entry }))
      .filter(({ entry }) => typeof entry !== 'function')
      .map(({ index, entry }) => `${String(index)}: ${String(entry)}`);

    expect(broken, `${registryName}: элементы без класса`).toEqual([]);
    expect(classes.length).toBeGreaterThan(0);
  });

  it('даёт каждому классу непустое имя — из него строится DI-символ', () => {
    const unnamed = classes
      .filter((entry): entry is { name: string } => typeof entry === 'function')
      .filter((entry) => entry.name === '')
      .map((entry) => String(entry));

    expect(unnamed, `${registryName}: анонимные классы`).toEqual([]);
  });
});
